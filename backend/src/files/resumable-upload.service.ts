import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { randomUUID } from 'crypto';
import { SupabaseService } from '../supabase/supabase.service';
import { B2StorageService } from './b2-storage.service';
import { hasBlenderHeader } from './blend-validation';
import { RESUMABLE_CHUNK_SIZE_BYTES, RESUMABLE_MAX_FILE_SIZE_BYTES, RESUMABLE_MAX_PARTS } from './resumable-upload.constants';

const TABLE = 'upload_sessions';
const PARTS_TABLE = 'upload_session_parts';
const ACCEPTED_EXTENSION = '.blend';
type UploadSessionStatus = 'ACTIVE' | 'COMPLETED' | 'ABORTED';

interface UploadSessionRow {
  id: string;
  customer_id: string;
  object_key: string;
  multipart_upload_id: string;
  file_name: string;
  file_size_bytes: number | string;
  content_type: string;
  total_parts: number;
  status: UploadSessionStatus;
}

interface UploadPartRow {
  part_number: number;
  etag: string;
  part_size_bytes: number | string;
}

function safeFileName(fileName: string): string {
  const baseName = fileName.split(/[\\/]/).pop() || 'upload.blend';
  const cleaned = baseName.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 160);
  return cleaned.toLowerCase().endsWith(ACCEPTED_EXTENSION) ? cleaned : 'upload.blend';
}

function normalizeSession(row: UploadSessionRow): UploadSessionRow & { file_size_bytes: number } {
  return { ...row, file_size_bytes: Number(row.file_size_bytes), total_parts: Number(row.total_parts) };
}

@Injectable()
export class ResumableUploadService {
  private readonly logger = new Logger(ResumableUploadService.name);

  constructor(private readonly supabaseService: SupabaseService, private readonly b2StorageService: B2StorageService) {}

  @Cron('0 * * * *')
  async cleanupExpiredSessions(): Promise<void> {
    const now = new Date().toISOString();
    const { data, error } = await this.supabaseService.getClient().from(TABLE).select('id, object_key, multipart_upload_id').eq('status', 'ACTIVE').lt('expires_at', now);
    if (error) {
      this.logger.error('Không đọc được upload session hết hạn: ' + error.message);
      return;
    }
    for (const row of (data || []) as { id: string; object_key: string; multipart_upload_id: string }[]) {
      await this.b2StorageService.abortMultipartUpload(row.object_key, row.multipart_upload_id).catch((err: unknown) => {
        this.logger.warn('Abort multipart session ' + row.id + ' thất bại: ' + (err instanceof Error ? err.message : String(err)));
      });
      const { error: updateError } = await this.supabaseService.getClient().from(TABLE).update({ status: 'ABORTED', updated_at: now }).eq('id', row.id).eq('status', 'ACTIVE');
      if (updateError) this.logger.error('Không đánh dấu được session hết hạn ' + row.id + ': ' + updateError.message);
    }
  }
  async init(input: { customerId: string; fileName: string; fileSizeBytes: number; contentType?: string | null; resumeSessionId?: string | null }) {
    this.validateFileMetadata(input.fileName, input.fileSizeBytes);
    if (input.resumeSessionId) {
      const existing = await this.getSession(input.resumeSessionId, input.customerId);
      if (existing.file_name !== safeFileName(input.fileName) || existing.file_size_bytes !== input.fileSizeBytes || existing.status !== 'ACTIVE') {
        throw new BadRequestException('Upload session không khớp file hoặc đã hoàn tất');
      }
      return this.statusFromSession(existing);
    }
    const totalParts = Math.ceil(input.fileSizeBytes / RESUMABLE_CHUNK_SIZE_BYTES);
    if (totalParts > RESUMABLE_MAX_PARTS) throw new BadRequestException('File có quá nhiều phần upload');
    const objectKey = 'uploads/' + randomUUID() + '-' + safeFileName(input.fileName);
    const contentType = input.contentType || 'application/octet-stream';
    const multipart = await this.b2StorageService.createMultipartUpload(objectKey, contentType);
    const { data, error } = await this.supabaseService.getClient().from(TABLE).insert({ customer_id: input.customerId, object_key: objectKey, multipart_upload_id: multipart.uploadId, file_name: safeFileName(input.fileName), file_size_bytes: input.fileSizeBytes, content_type: contentType, total_parts: totalParts }).select().single();
    if (error || !data) {
      await this.b2StorageService.abortMultipartUpload(objectKey, multipart.uploadId).catch(() => undefined);
      throw new Error('Không tạo được upload session: ' + (error && error.message ? error.message : 'không có dữ liệu'));
    }
    return this.statusFromSession(normalizeSession(data as UploadSessionRow));
  }

  async status(sessionId: string, customerId: string) {
    const session = await this.getSession(sessionId, customerId);
    return this.statusFromSession(session);
  }

  async uploadPart(sessionId: string, customerId: string, partNumber: number, buffer: Buffer) {
    const session = await this.getSession(sessionId, customerId);
    if (!Number.isInteger(partNumber) || partNumber < 1 || partNumber > session.total_parts) throw new BadRequestException('Số thứ tự chunk không hợp lệ');
    if (buffer.length === 0 || buffer.length > RESUMABLE_CHUNK_SIZE_BYTES) throw new BadRequestException('Kích thước chunk không hợp lệ');
    const isLastPart = partNumber === session.total_parts;
    if (!isLastPart && buffer.length !== RESUMABLE_CHUNK_SIZE_BYTES) throw new BadRequestException('Chunk không cuối phải đủ 8MB');
    if (partNumber === 1 && !hasBlenderHeader(buffer)) throw new BadRequestException('Chunk đầu không có header Blender hợp lệ');
    const etag = await this.b2StorageService.uploadMultipartPart(session.object_key, session.multipart_upload_id, partNumber, buffer);
    const { error } = await this.supabaseService.getClient().from(PARTS_TABLE).upsert({ session_id: session.id, part_number: partNumber, etag, part_size_bytes: buffer.length }, { onConflict: 'session_id,part_number' });
    if (error) throw new Error('Không lưu được trạng thái chunk: ' + error.message);
    return { sessionId, partNumber, uploaded: true };
  }

  async complete(sessionId: string, customerId: string) {
    const session = await this.getSession(sessionId, customerId);
    const { data, error } = await this.supabaseService.getClient().from(PARTS_TABLE).select('part_number, etag, part_size_bytes').eq('session_id', session.id).order('part_number', { ascending: true });
    if (error) throw new Error('Không đọc được chunk state: ' + error.message);
    const parts = (data || []) as UploadPartRow[];
    if (parts.length !== session.total_parts) throw new BadRequestException('Upload chưa đủ chunk: ' + parts.length + '/' + session.total_parts);
    const totalBytes = parts.reduce((sum, part) => sum + Number(part.part_size_bytes), 0);
    if (totalBytes !== session.file_size_bytes || !parts.every((part, index) => Number(part.part_number) === index + 1)) throw new BadRequestException('Kích thước hoặc thứ tự chunk không khớp file');
    await this.b2StorageService.completeMultipartUpload(session.object_key, session.multipart_upload_id, parts.map(part => ({ PartNumber: Number(part.part_number), ETag: part.etag })));
    const now = new Date().toISOString();
    const { data: updated, error: updateError } = await this.supabaseService.getClient().from(TABLE).update({ status: 'COMPLETED', updated_at: now, completed_at: now }).eq('id', session.id).eq('customer_id', customerId).eq('status', 'ACTIVE').select().maybeSingle();
    if (updateError) throw new Error('Không cập nhật được upload session: ' + updateError.message);
    if (!updated) throw new BadRequestException('Upload session không còn active');
    return { fileRef: session.object_key, fileName: session.file_name, fileSizeBytes: session.file_size_bytes };
  }

  async abort(sessionId: string, customerId: string) {
    const session = await this.getSession(sessionId, customerId);
    await this.b2StorageService.abortMultipartUpload(session.object_key, session.multipart_upload_id);
    const { error } = await this.supabaseService.getClient().from(TABLE).update({ status: 'ABORTED', updated_at: new Date().toISOString() }).eq('id', session.id).eq('customer_id', customerId).eq('status', 'ACTIVE');
    if (error) throw new Error('Không cập nhật được upload session: ' + error.message);
    return { aborted: true };
  }

  private async getSession(sessionId: string, customerId: string): Promise<UploadSessionRow & { file_size_bytes: number }> {
    const { data, error } = await this.supabaseService.getClient().from(TABLE).select('*').eq('id', sessionId).eq('customer_id', customerId).maybeSingle();
    if (error) throw new Error('Không đọc được upload session: ' + error.message);
    if (!data) throw new NotFoundException('Không tìm thấy upload session');
    const session = normalizeSession(data as UploadSessionRow);
    if (session.status !== 'ACTIVE') throw new BadRequestException('Upload session không còn active');
    return session;
  }

  private async statusFromSession(session: UploadSessionRow & { file_size_bytes: number }) {
    const { data, error } = await this.supabaseService.getClient().from(PARTS_TABLE).select('part_number').eq('session_id', session.id).order('part_number', { ascending: true });
    if (error) throw new Error('Không đọc được trạng thái chunk: ' + error.message);
    return { sessionId: session.id, chunkSizeBytes: RESUMABLE_CHUNK_SIZE_BYTES, totalParts: session.total_parts, uploadedParts: (data || []).map((row: { part_number: number }) => Number(row.part_number)), status: session.status };
  }

  private validateFileMetadata(fileName: string, fileSizeBytes: number): void {
    if (!fileName.trim().toLowerCase().endsWith(ACCEPTED_EXTENSION)) throw new BadRequestException('Chỉ chấp nhận file .blend');
    if (!Number.isSafeInteger(fileSizeBytes) || fileSizeBytes <= 0 || fileSizeBytes > RESUMABLE_MAX_FILE_SIZE_BYTES) throw new BadRequestException('Kích thước file không hợp lệ hoặc vượt quá 2GB');
  }
}
