import { useState, useCallback } from 'react';
import { submitGoogleDrive, toReadableErrorMessage } from '../services/RenderService';

/**
 * Hook quản lý việc nhập link Google Drive: validate cú pháp + resolve
 * (hỏi Backend lấy tên file) đều đi qua RenderService.submitGoogleDrive().
 *
 * Canonical Spec 008 contract: a successful authenticated Drive submission
 * already passed INPUT_SAFE and Backend already created exactly one Job.
 * A response without jobId is therefore incomplete/stale and must not leave
 * the UI in a pseudo-success state that can fall back to legacy POST /jobs.
 */
export function useDriveLink() {
  const [driveLink, setDriveLinkState] = useState(null);
  const [resolvedInfo, setResolvedInfo] = useState(null); // { fileRef, fileName, fileSizeBytes, jobId }
  const [linkError, setLinkError] = useState(null);
  const [isResolving, setIsResolving] = useState(false);

  const submitLink = useCallback(async (rawLink) => {
    setIsResolving(true);
    setLinkError(null);
    try {
      const result = await submitGoogleDrive(rawLink);
      if (typeof result?.jobId !== 'string' || !result.jobId.trim()) {
        throw new Error('Backend chưa tự tạo Job sau INPUT_SAFE');
      }
      setDriveLinkState(result.driveLink);
      setResolvedInfo({
        fileRef: result.fileRef || null,
        fileName: result.fileName,
        fileSizeBytes: result.fileSizeBytes,
        jobId: result.jobId,
      });
      return true;
    } catch (err) {
      setLinkError(toReadableErrorMessage(err, 'Không thể gửi link Google Drive'));
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

  const restoreResolved = useCallback((result) => {
    if (!result?.driveLink) return;
    if (typeof result?.jobId !== 'string' || !result.jobId.trim()) {
      setDriveLinkState(null);
      setResolvedInfo(null);
      setLinkError('Phiên Drive cũ chưa có Job hợp lệ; vui lòng gửi lại link.');
      return;
    }
    setDriveLinkState(result.driveLink);
    setResolvedInfo({
      fileRef: result.fileRef || null,
      fileName: result.fileName || null,
      fileSizeBytes: result.fileSizeBytes ?? null,
      jobId: result.jobId,
    });
    setLinkError(null);
  }, []);

  return {
    driveLink,
    linkError,
    resolvedInfo,
    isResolving,
    submitLink,
    restoreResolved,
    clearLink,
  };
}
