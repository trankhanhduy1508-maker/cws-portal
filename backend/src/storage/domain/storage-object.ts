export interface StorageObject {
  id: string;
  jobId: string;
  sourcePath: string | null;
  reviewPath: string | null;
  finalPath: string | null;
  logPath: string | null;
  uploadedAt: number;
}

export interface ReviewImage {
  id: string;
  jobId: string;
  imagePath: string;
  displayOrder: number | null;
  createdAt: number;
}
