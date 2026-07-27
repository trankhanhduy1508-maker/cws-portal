import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { AppConfig } from '../config/configuration';

/**
 * Cung cấp 1 SupabaseClient DUY NHẤT dùng Service Role Key — khác với
 * Worker (cws_worker_full.py) đang dùng Publishable Key chịu RLS.
 * Backend là server tin cậy (không phải trình duyệt/máy đối tác phân
 * tán), nên dùng Service Role Key hợp lý để có toàn quyền đọc/ghi các
 * bảng MỚI của Backend — TUYỆT ĐỐI không để lộ key này ra Portal hay
 * bất kỳ client-side code nào.
 */
@Injectable()
export class SupabaseService {
  private readonly client: SupabaseClient;

  constructor(private readonly configService: ConfigService<AppConfig, true>) {
    const url = this.configService.get('supabaseUrl', { infer: true });
    const key = this.configService.get('supabaseServiceRoleKey', { infer: true });
    this.client = createClient(url, key, {
      auth: { persistSession: false },
    });
  }

  getClient(): SupabaseClient {
    return this.client;
  }
}
