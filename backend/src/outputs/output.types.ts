export interface OutputRecord {
  id: string;
  orderId: string;
  objectKey: string;
  sizeBytes: number;
  status: 'locked' | 'unlocked' | 'revoked';
}
export interface OutputAccessGrant { url: string; expiresAt: number; }
