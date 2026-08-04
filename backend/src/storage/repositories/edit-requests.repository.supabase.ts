import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../../supabase/supabase.service';
import {
  EditRequest,
  EditRequestStatus,
} from '../domain/edit-request';
import { IEditRequestsRepository } from './edit-requests.repository.interface';

const TABLE = 'edit_requests';

interface EditRequestRow {
  id: string;
  job_id: string;
  requested_by: string;
  note: string | null;
  status: EditRequestStatus;
  assigned_to: string | null;
  expected_response_at: string | null;
  created_at: string;
  updated_at: string;
}

function rowToDomain(row: EditRequestRow): EditRequest {
  return {
    id: row.id,
    jobId: row.job_id,
    requestedBy: row.requested_by,
    note: row.note,
    status: row.status,
    assignedTo: row.assigned_to,
    expectedResponseAt: row.expected_response_at
      ? new Date(row.expected_response_at).getTime()
      : null,
    createdAt: new Date(row.created_at).getTime(),
    updatedAt: new Date(row.updated_at).getTime(),
  };
}

@Injectable()
export class SupabaseEditRequestsRepository implements IEditRequestsRepository {
  private readonly logger = new Logger(SupabaseEditRequestsRepository.name);

  constructor(private readonly supabaseService: SupabaseService) {}

  async create(input: {
    jobId: string;
    requestedBy: string;
    note: string | null;
  }): Promise<EditRequest> {
    const { data, error } = await this.supabaseService
      .getClient()
      .from(TABLE)
      .insert({
        job_id: input.jobId,
        requested_by: input.requestedBy,
        note: input.note,
      })
      .select()
      .single();

    if (error) {
      this.logger.error(`create(${input.jobId}) thất bại: ${error.message}`);
      throw new Error(`Không lưu được yêu cầu chỉnh sửa: ${error.message}`);
    }
    return rowToDomain(data as EditRequestRow);
  }

  async findByJobId(jobId: string): Promise<EditRequest[]> {
    const { data, error } = await this.supabaseService
      .getClient()
      .from(TABLE)
      .select('*')
      .eq('job_id', jobId)
      .order('created_at', { ascending: false });

    if (error) {
      this.logger.error(`findByJobId(${jobId}) thất bại: ${error.message}`);
      throw new Error(`Không đọc được yêu cầu chỉnh sửa: ${error.message}`);
    }
    return (data as EditRequestRow[]).map(rowToDomain);
  }

  async findAll(): Promise<EditRequest[]> {
    const { data, error } = await this.supabaseService
      .getClient()
      .from(TABLE)
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      this.logger.error(`findAll() thất bại: ${error.message}`);
      throw new Error(`Không đọc được danh sách yêu cầu chỉnh sửa: ${error.message}`);
    }
    return (data as EditRequestRow[]).map(rowToDomain);
  }

  async updateStatus(
    id: string,
    status: EditRequestStatus,
    assignedTo: string | null = null,
    expectedResponseAt: number | null = null,
  ): Promise<EditRequest | null> {
    const patch = {
      status,
      assigned_to: assignedTo,
      expected_response_at: expectedResponseAt
        ? new Date(expectedResponseAt).toISOString()
        : null,
      updated_at: new Date().toISOString(),
    };
    const { data, error } = await this.supabaseService
      .getClient()
      .from(TABLE)
      .update(patch)
      .eq('id', id)
      .select()
      .maybeSingle();

    if (error) {
      this.logger.error(`updateStatus(${id}) thất bại: ${error.message}`);
      throw new Error(`Không cập nhật được yêu cầu chỉnh sửa: ${error.message}`);
    }
    return data ? rowToDomain(data as EditRequestRow) : null;
  }
}
