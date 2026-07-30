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

export interface DownloadLog {
  id: string;
  jobId: string;
  customerId: string | null;
  downloadedAt: number;
  ipAddress: string | null;
}

export interface WorkerLog {
  id: string;
  jobId: string;
  workerName: string | null;
  message: string | null;
  level: string;
  createdAt: number;
}
