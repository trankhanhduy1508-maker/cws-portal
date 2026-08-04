import { useState, useCallback } from 'react';
import { submitGoogleDrive } from '../services/RenderService';

/**
 * Hook quản lý link Google Drive đã được Backend hỗ trợ thật: validate
 * và resolve tên/dung lượng file đều đi qua RenderService.
 */
export function useDriveLink() {
  const [driveLink, setDriveLinkState] = useState(null);
  const [resolvedInfo, setResolvedInfo] = useState(null); // { fileName, fileSizeBytes }
  const [linkError, setLinkError] = useState(null);
  const [isResolving, setIsResolving] = useState(false);

  const submitLink = useCallback(async (rawLink) => {
    setIsResolving(true);
    setLinkError(null);
    try {
      const result = await submitGoogleDrive(rawLink);
      setDriveLinkState(result.driveLink);
      setResolvedInfo({ fileName: result.fileName, fileSizeBytes: result.fileSizeBytes });
      return true;
    } catch (err) {
      setLinkError(err.message || 'Link không hợp lệ');
      setDriveLinkState(null);
      setResolvedInfo(null);
      return false;
    } finally {
      setIsResolving(false);
    }
  }, []);

  const clearLink = useCallback(() => {
    setDriveLinkState(null);
    setLinkError(null);
    setResolvedInfo(null);
  }, []);

  return { driveLink, linkError, resolvedInfo, isResolving, submitLink, clearLink };
}
