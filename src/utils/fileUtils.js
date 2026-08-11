import { ACCEPTED_FILE_EXTENSIONS, MAX_FILE_SIZE_BYTES, SHARED_LINK_PATTERNS } from '../constants/renderConstants';

export function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

export function getFileExtension(filename) {
  const idx = filename.lastIndexOf('.');
  return idx === -1 ? '' : filename.slice(idx).toLowerCase();
}

/**
 * Validate file thật trước khi cho phép submit.
 * Trả về { valid: boolean, error: string|null }
 */
export function validateFile(file) {
  if (!file) {
    return { valid: false, error: 'Chưa chọn file' };
  }

  const ext = getFileExtension(file.name);
  if (!ACCEPTED_FILE_EXTENSIONS.includes(ext)) {
    return {
      valid: false,
      error: `Định dạng không được hỗ trợ. Chỉ chấp nhận: ${ACCEPTED_FILE_EXTENSIONS.join(', ')}`,
    };
  }

  if (file.size === 0) {
    return { valid: false, error: 'File rỗng, vui lòng chọn file khác' };
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return {
      valid: false,
      error: `File quá lớn (tối đa ${formatBytes(MAX_FILE_SIZE_BYTES)})`,
    };
  }

  return { valid: true, error: null };
}

/**
 * Validate the Backend contract returned after materialization. A filename or
 * Drive URL alone is not an input reference that can safely enter the next
 * workflow step.
 */
export function validateMaterializedInput(input) {
  if (!input || typeof input.fileRef !== 'string' || !input.fileRef.trim()) {
    return { valid: false, error: 'Backend chưa trả về fileRef hợp lệ' };
  }

  const fileName = typeof input.fileName === 'string' ? input.fileName : '';
  const ext = getFileExtension(fileName);
  if (!ACCEPTED_FILE_EXTENSIONS.includes(ext)) {
    return { valid: false, error: 'Backend trả về định dạng file không được hỗ trợ' };
  }

  if (!Number.isInteger(input.fileSizeBytes) || input.fileSizeBytes <= 0) {
    return { valid: false, error: 'Backend chưa trả về kích thước file hợp lệ' };
  }
  if (input.fileSizeBytes > MAX_FILE_SIZE_BYTES) {
    return { valid: false, error: 'File vượt giới hạn kích thước cho phép' };
  }

  return { valid: true, error: null };
}

/**
 * Validate CÚ PHÁP của link chia sẻ (Google Drive / OneDrive / Dropbox
 * — CWS_ROADMAP_MVP_V1.md). Đây chỉ kiểm tra định dạng URL, KHÔNG xác
 * nhận file có thật/có quyền truy cập — việc đó cần Backend thật gọi
 * API tương ứng để kiểm tra (hiện chỉ Google Drive có kiểm tra thật).
 *
 * @returns {{ valid: boolean, error: string|null }}
 */
export function validateDriveLink(link) {
  const trimmed = (link || '').trim();

  if (!trimmed) {
    return { valid: false, error: 'Vui lòng dán link file Google Drive' };
  }

  if (!SHARED_LINK_PATTERNS.some((pattern) => pattern.test(trimmed))) {
    return {
      valid: false,
      error: 'Link phải là link file Google Drive hợp lệ.',
    };
  }

  return { valid: true, error: null };
}
