export type EditRequestStatus =
  | 'REQUESTED'
  | 'ACKNOWLEDGED'
  | 'IN_PROGRESS'
  | 'RESOLVED'
  | 'DECLINED';

export interface EditRequest {
  id: string;
  jobId: string;
  requestedBy: string;
  note: string | null;
  status: EditRequestStatus;
  assignedTo: string | null;
  expectedResponseAt: number | null;
  createdAt: number;
  updatedAt: number;
}
