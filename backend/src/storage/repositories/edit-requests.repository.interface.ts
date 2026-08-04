import { EditRequest, EditRequestStatus } from '../domain/edit-request';

export const EDIT_REQUESTS_REPOSITORY = Symbol('EDIT_REQUESTS_REPOSITORY');

export interface IEditRequestsRepository {
  create(input: {
    jobId: string;
    requestedBy: string;
    note: string | null;
  }): Promise<EditRequest>;
  findByJobId(jobId: string): Promise<EditRequest[]>;
  findAll(): Promise<EditRequest[]>;
  updateStatus(
    id: string,
    status: EditRequestStatus,
    assignedTo?: string | null,
    expectedResponseAt?: number | null,
  ): Promise<EditRequest | null>;
}
