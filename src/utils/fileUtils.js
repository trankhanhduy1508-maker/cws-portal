import { ACCEPTED_FILE_EXTENSIONS, MAX_FILE_SIZE_BYTES, GOOGLE_DRIVE_LINK_PATTERN } from '../constants/renderConstants';

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
 * Validate cú pháp Google Drive trước khi gửi Backend resolve thật.
 * Backend tiếp tục kiểm tra file tồn tại/quyền truy cập/tên/dung lượng.
 * Các nguồn khác chưa có integration thật nên không được nhận ở UI.
 *
 * @returns {{ valid: boolean, error: string|null }}
 */
export function validateDriveLink(link) {
  const trimmed = (link || '').trim();

  if (!trimmed) {
    return { valid: false, error: 'Vui lòng dán link Google Drive' };
  }

  if (!GOOGLE_DRIVE_LINK_PATTERN.test(trimmed)) {
    return {
      valid: false,
      error: 'Link phải bắt đầu bằng https://. Vui lòng kiểm tra lại link chia sẻ.',
    };
  }

  return { valid: true, error: null };
}
