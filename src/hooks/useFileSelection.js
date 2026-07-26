import { useState, useCallback } from 'react';
import { validateFile } from '../utils/fileUtils';

/**
 * Hook quản lý file người dùng chọn — validate thật ngay khi chọn,
 * không đợi tới lúc submit mới báo lỗi.
 */
export function useFileSelection() {
  const [file, setFileState] = useState(null);
  const [fileError, setFileError] = useState(null);

  const setFile = useCallback((selectedFile) => {
    const { valid, error } = validateFile(selectedFile);
    if (!valid) {
      setFileState(null);
      setFileError(error);
      return;
    }
    setFileState(selectedFile);
    setFileError(null);
  }, []);

  const clearFile = useCallback(() => {
    setFileState(null);
    setFileError(null);
  }, []);

  return { file, fileError, setFile, clearFile };
}
