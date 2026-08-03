import { useState, useCallback } from 'react';
import { uploadFile } from '../services/RenderService';

/**
 * Hook thực hiện việc "tải file lên" (gọi RenderService.uploadFile())
 * tại đúng thời điểm người dùng xác nhận muốn tiếp tục — không tải lên
 * ngay lúc vừa chọn file, tránh tải lãng phí nếu người dùng đổi ý.
 */
export function useFileUploadResolver() {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [progress, setProgress] = useState(0);

  const resolve = useCallback(async (file) => {
    setIsUploading(true);
    setUploadError(null);
    setProgress(0);
    try {
      return await uploadFile(file, { onProgress: setProgress }); // { fileRef, fileName, fileSizeBytes }
    } catch (err) {
      setUploadError(err.message || 'Tải file thất bại');
      throw err;
    } finally {
      setIsUploading(false);
    }
  }, []);

  return { resolve, isUploading, uploadError, progress };
}
