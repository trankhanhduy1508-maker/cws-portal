import { readFileSync } from 'fs';
import { resolve } from 'path';

function source(relativePath: string): string {
  return readFileSync(resolve(__dirname, relativePath), 'utf8');
}

describe('resumable upload contracts', () => {
  it('uses an owner-bound persistent session and RLS', () => {
    const migration = source('../../migrations/018_create_resumable_upload_sessions.sql');
    const service = source('./resumable-upload.service.ts');
    expect(migration).toContain('customer_id uuid NOT NULL');
    expect(migration).toContain('ALTER TABLE public.upload_sessions ENABLE ROW LEVEL SECURITY;');
    expect(migration).toContain('auth.uid() = customer_id');
    expect(service).toContain(".eq('customer_id', customerId)");
    expect(service).toContain('multipart_upload_id');
  });

  it('validates the native Blender header on the first chunk and bounds chunk size', () => {
    const service = source('./resumable-upload.service.ts');
    const constants = source('./resumable-upload.constants.ts');
    expect(service).toContain('hasBlenderHeader(buffer)');
    expect(service).toContain('RESUMABLE_CHUNK_SIZE_BYTES');
    expect(constants).toContain('8 * 1024 * 1024');
  });

  it('exposes authenticated init/part/complete/abort routes', () => {
    const controller = source('./files.controller.ts');
    expect(controller).toContain('@UseGuards(JwtAuthGuard)');
    expect(controller).toContain("files/upload-resumable/init");
    expect(controller).toContain("files/upload-resumable/:sessionId/parts/:partNumber");
    expect(controller).toContain("files/upload-resumable/:sessionId/complete");
    expect(controller).toContain("@Delete('files/upload-resumable/:sessionId')");
  });
});
