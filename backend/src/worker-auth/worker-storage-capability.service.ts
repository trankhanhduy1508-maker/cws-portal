import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { AppConfig } from '../config/configuration';
import { WorkerRpcService } from './worker-rpc.service';

const CAPABILITY_TTL_SECONDS = 120;
const MAX_OUTPUT_BYTES = 2 * 1024 * 1024 * 1024;
const SHA256 = /^[a-f0-9]{64}$/;

type CapabilityAction = 'input_download' | 'frame_upload' | 'frame_download';

export interface WorkerStorageCapabilityRequest {
  action: CapabilityAction;
  task_id: number;
  generation: number;
  frame?: number;
  bytes?: number;
  sha256?: string;
}

interface ClaimedTaskSpec {
  job_id: string;
  task_id: string;
  attempt_id: string;
  lease_generation: number;
  project_uri: string;
  frame_start: number;
  frame_end: number;
  output_prefix: string;
  output_format: string;
}

@Injectable()
export class WorkerStorageCapabilityService {
  private readonly s3: S3Client;
  private readonly bucket: string;

  constructor(
    configService: ConfigService<AppConfig, true>,
    private readonly workerRpcService: WorkerRpcService,
  ) {
    const b2 = configService.get('b2', { infer: true });
    this.bucket = b2.bucketName;
    this.s3 = new S3Client({
      endpoint: `https://${b2.endpoint}`,
      region: 'auto',
      credentials: {
        accessKeyId: b2.keyId,
        secretAccessKey: b2.applicationKey,
      },
    });
  }

  async issue(workerId: string, request: WorkerStorageCapabilityRequest) {
    const taskId = this.positiveInteger(request.task_id, 'task_id');
    const generation = this.positiveInteger(request.generation, 'generation');
    const spec = await this.claimedSpec(workerId, taskId, generation);

    if (request.action === 'input_download') {
      const key = this.inputKey(spec.project_uri);
      return this.downloadCapability(key);
    }

    const frame = this.positiveInteger(request.frame, 'frame');
    if (frame < spec.frame_start || frame > spec.frame_end) {
      throw new BadRequestException('frame is outside the claimed task range');
    }
    const key = this.outputKey(spec, frame);

    if (request.action === 'frame_download') {
      return this.existingFrameCapability(key, spec, frame);
    }
    if (request.action === 'frame_upload') {
      const bytes = this.positiveInteger(request.bytes, 'bytes');
      if (bytes > MAX_OUTPUT_BYTES) {
        throw new BadRequestException('output exceeds the per-frame limit');
      }
      const sha256 = String(request.sha256 ?? '').toLowerCase();
      if (!SHA256.test(sha256)) {
        throw new BadRequestException(
          'sha256 must be a lowercase SHA-256 digest',
        );
      }
      return this.uploadCapability(key, spec, frame, bytes, sha256);
    }
    throw new BadRequestException('unsupported storage capability action');
  }

  private async claimedSpec(
    workerId: string,
    taskId: number,
    generation: number,
  ): Promise<ClaimedTaskSpec> {
    const value = await this.workerRpcService.call(
      'get_claimed_task_spec',
      workerId,
      { p_task_id: taskId, p_generation: generation },
    );
    const rows = Array.isArray(value) ? value : value ? [value] : [];
    if (rows.length !== 1 || !this.isSpec(rows[0])) {
      throw new BadRequestException(
        'no active claimed task for storage capability',
      );
    }
    return rows[0];
  }

  private inputKey(uri: string): string {
    let parsed: URL;
    try {
      parsed = new URL(uri);
    } catch {
      throw new BadRequestException('claimed task input is not a B2 object');
    }
    const path = parsed.pathname.replace(/^\/+/, '');
    const host = parsed.hostname.toLowerCase();
    const key =
      host === this.bucket.toLowerCase()
        ? path
        : host === 'uploads'
          ? `uploads/${path}`
          : parsed.hostname === ''
            ? path
            : '';
    if (
      parsed.protocol !== 'b2:' ||
      !this.safeKey(key) ||
      !key.startsWith('uploads/') ||
      !/\.(blend|zip)$/i.test(key)
    ) {
      throw new BadRequestException(
        'claimed task input is not an allowed B2 object',
      );
    }
    return key;
  }

  private outputKey(spec: ClaimedTaskSpec, frame: number): string {
    const prefix = spec.output_prefix.replace(/^\/+|\/+$/g, '');
    if (
      !this.safeKey(prefix) ||
      !['png', 'jpg', 'jpeg'].includes(spec.output_format)
    ) {
      throw new BadRequestException('claimed task output path is invalid');
    }
    return `${prefix}/${spec.task_id}/frame_${String(frame).padStart(4, '0')}.${spec.output_format}`;
  }

  private async downloadCapability(key: string) {
    const url = await getSignedUrl(
      this.s3,
      new GetObjectCommand({ Bucket: this.bucket, Key: key }),
      { expiresIn: CAPABILITY_TTL_SECONDS },
    );
    return this.response('GET', key, url, {});
  }

  private async uploadCapability(
    key: string,
    spec: ClaimedTaskSpec,
    frame: number,
    bytes: number,
    sha256: string,
  ) {
    const contentType =
      spec.output_format === 'png' ? 'image/png' : 'image/jpeg';
    const metadata = {
      job_id: spec.job_id,
      task_id: spec.task_id,
      attempt_id: spec.attempt_id,
      generation: String(spec.lease_generation),
      frame: String(frame),
      bytes: String(bytes),
      sha256,
    };
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ContentLength: bytes,
      ContentType: contentType,
      Metadata: metadata,
    });
    const url = await getSignedUrl(this.s3, command, {
      expiresIn: CAPABILITY_TTL_SECONDS,
    });
    const headers: Record<string, string> = {
      'content-type': contentType,
      'content-length': String(bytes),
    };
    for (const [name, value] of Object.entries(metadata)) {
      headers[`x-amz-meta-${name}`] = value;
    }
    return this.response('PUT', key, url, headers);
  }

  private async existingFrameCapability(
    key: string,
    spec: ClaimedTaskSpec,
    frame: number,
  ) {
    try {
      const head = await this.s3.send(
        new HeadObjectCommand({ Bucket: this.bucket, Key: key }),
      );
      const metadata = head.Metadata ?? {};
      if (
        metadata.job_id !== spec.job_id ||
        metadata.task_id !== spec.task_id ||
        metadata.attempt_id !== spec.attempt_id ||
        metadata.generation !== String(spec.lease_generation) ||
        metadata.frame !== String(frame) ||
        !SHA256.test(metadata.sha256 ?? '') ||
        !/^\d+$/.test(metadata.bytes ?? '')
      ) {
        return { exists: false };
      }
      const capability = await this.downloadCapability(key);
      return {
        exists: true,
        ...capability,
        sha256: metadata.sha256,
        bytes: Number(metadata.bytes),
      };
    } catch (error) {
      const status = (error as { $metadata?: { httpStatusCode?: number } })
        .$metadata?.httpStatusCode;
      if (status === 404) return { exists: false };
      throw new InternalServerErrorException('storage capability probe failed');
    }
  }

  private response(
    method: 'GET' | 'PUT',
    key: string,
    url: string,
    headers: Record<string, string>,
  ) {
    return {
      method,
      url,
      headers,
      object_key: key,
      expires_in_seconds: CAPABILITY_TTL_SECONDS,
    };
  }

  private safeKey(value: string): boolean {
    return (
      value.length > 0 &&
      value.length <= 1024 &&
      !value.includes('\\') &&
      !value.includes('\0') &&
      value
        .split('/')
        .every((part) => part !== '' && part !== '.' && part !== '..')
    );
  }

  private positiveInteger(value: unknown, name: string): number {
    if (!Number.isInteger(value) || Number(value) <= 0) {
      throw new BadRequestException(`${name} must be a positive integer`);
    }
    return Number(value);
  }

  private isSpec(value: unknown): value is ClaimedTaskSpec {
    if (!value || typeof value !== 'object') return false;
    const spec = value as Record<string, unknown>;
    return (
      typeof spec.job_id === 'string' &&
      typeof spec.task_id === 'string' &&
      typeof spec.attempt_id === 'string' &&
      Number.isInteger(spec.lease_generation) &&
      typeof spec.project_uri === 'string' &&
      Number.isInteger(spec.frame_start) &&
      Number.isInteger(spec.frame_end) &&
      typeof spec.output_prefix === 'string' &&
      typeof spec.output_format === 'string'
    );
  }
}
