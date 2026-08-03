import { useState, useCallback } from 'react';
import { validateBlendHeader, validateFile } from '../utils/fileUtils';

/**
 * Hook quản lý file người dùng chọn — validate thật ngay khi chọn,
 * không đợi tới lúc submit mới báo lỗi.
 */
export function useFileSelection() {
  const [file, setFileState] = useState(null);
  const [fileError, setFileError] = useState(null);
  const [isValidating, setIsValidating] = useState(false);

  const setFile = useCallback(async (selectedFile) => {
    const { valid, error } = validateFile(selectedFile);
    if (!valid) {
      setFileState(null);
      setFileError(error);
      return;
    }
    setIsValidating(true);
    setFileState(null);
    setFileError(null);
    try {
      const headerResult = await validateBlendHeader(selectedFile);
      if (!headerResult.valid) {
        setFileError(headerResult.error);
        return;
      }
      setFileState(selectedFile);
    } finally {
      setIsValidating(false);
    }
  }, []);

  const clearFile = useCallback(() => {
    setFileState(null);
    setFileError(null);
  }, []);

  return { file, fileError, setFile, clearFile, isValidating };
}
