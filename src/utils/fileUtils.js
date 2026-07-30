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
    return { valid: false, error: 'Vui lòng dán link chia sẻ (Google Drive/OneDrive/Dropbox/Direct Link)' };
  }

  if (!SHARED_LINK_PATTERNS.some((pattern) => pattern.test(trimmed))) {
    return {
      valid: false,
      error: 'Link phải bắt đầu bằng https://. Vui lòng kiểm tra lại link chia sẻ.',
    };
  }

  return { valid: true, error: null };
}
