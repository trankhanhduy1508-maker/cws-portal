import { useState, useCallback } from 'react';
import { toReadableErrorMessage, uploadFile } from '../services/RenderService';

/**
 * Hook thực hiện việc "tải file lên" (gọi RenderService.uploadFile())
 * tại đúng thời điểm người dùng xác nhận muốn tiếp tục — không tải lên
 * ngay lúc vừa chọn file, tránh tải lãng phí nếu người dùng đổi ý.
 *
 * Canonical Spec 008 contract: a successful authenticated submission must
 * already have exactly one Backend-created Job. Never fall back to a second
 * frontend POST /jobs when the response is missing jobId.
 */
export function useFileUploadResolver() {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);

  const resolve = useCallback(async (file) => {
    setIsUploading(true);
    setUploadError(null);
    try {
      const result = await uploadFile(file);
      if (typeof result?.jobId !== 'string' || !result.jobId.trim()) {
        throw new Error('Backend chưa tự tạo Job sau INPUT_SAFE');
      }
      return result; // { fileRef, fileName, fileSizeBytes, jobId }
    } catch (err) {
      setUploadError(toReadableErrorMessage(err, 'Tải file thất bại'));
      throw err;
    } finally {
      setIsUploading(false);
    }
  }, []);

  return { resolve, isUploading, uploadError };
}
