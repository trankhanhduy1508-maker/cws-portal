import { useState, useCallback } from 'react';
import { validateDriveLink } from '../utils/fileUtils';
import { resolveDriveLink } from '../services/RenderService';

/**
 * Hook quản lý việc nhập link Google Drive: validate cú pháp ngay lập
 * tức, sau đó cố gắng "resolve" (hỏi Backend lấy tên file) — hiện tại
 * mock nên resolve luôn trả về không rõ tên file (xem RenderService).
 */
export function useDriveLink() {
  const [driveLink, setDriveLinkState] = useState(null);
  const [linkError, setLinkError] = useState(null);
  const [resolvedInfo, setResolvedInfo] = useState(null); // { fileName, fileSizeBytes }
  const [isResolving, setIsResolving] = useState(false);

  const submitLink = useCallback(async (rawLink) => {
    const { valid, error } = validateDriveLink(rawLink);
    if (!valid) {
      setLinkError(error);
      setDriveLinkState(null);
      setResolvedInfo(null);
      return false;
    }

    setLinkError(null);
    setDriveLinkState(rawLink.trim());
    setIsResolving(true);
    try {
      const info = await resolveDriveLink(rawLink.trim());
      setResolvedInfo(info);
    } finally {
      setIsResolving(false);
    }
    return true;
  }, []);

  const clearLink = useCallback(() => {
    setDriveLinkState(null);
    setLinkError(null);
    setResolvedInfo(null);
  }, []);

  return { driveLink, linkError, resolvedInfo, isResolving, submitLink, clearLink };
}
