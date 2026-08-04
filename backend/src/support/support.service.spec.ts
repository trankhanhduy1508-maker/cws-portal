import { ForbiddenException } from '@nestjs/common';
import { SupportService } from './support.service';

function makeSupabase(jobRow: { id: string } | null) {
  const maybeSingle = jest.fn().mockResolvedValue({ data: jobRow, error: null });
  const eqSecond = jest.fn().mockReturnValue({ maybeSingle });
  const eqFirst = jest.fn().mockReturnValue({ eq: eqSecond });
  const select = jest.fn().mockReturnValue({ eq: eqFirst });
  return {
    getClient: () => ({ from: jest.fn().mockReturnValue({ select }) }),
  };
}

describe('SupportService', () => {
  it('creates an owned ticket without exposing a customer-controlled owner', async () => {
    const repository = {
      create: jest.fn().mockResolvedValue({ id: 'ticket-1', ticketCode: 'CWS-SUP-1' }),
    };
    const service = new SupportService(repository as never, makeSupabase(null) as never);
    await service.create({
      customerId: 'customer-a',
      subject: 'Render issue',
      message: 'The render stopped.',
    });
    expect(repository.create).toHaveBeenCalledWith(expect.objectContaining({
      customerId: 'customer-a',
      jobId: null,
      subject: 'Render issue',
    }));
  });

  it('denies linking a ticket to another customer job', async () => {
    const repository = { create: jest.fn() };
    const service = new SupportService(repository as never, makeSupabase(null) as never);
    await expect(service.create({
      customerId: 'customer-a',
      jobId: 'job-owned-by-b',
      subject: 'Access',
      message: 'Please help.',
    })).rejects.toBeInstanceOf(ForbiddenException);
    expect(repository.create).not.toHaveBeenCalled();
  });

  it('rejects unsupported Admin status transitions', async () => {
    const repository = { updateStatus: jest.fn() };
    const service = new SupportService(repository as never, makeSupabase(null) as never);
    await expect(service.updateForAdmin({
      id: 'ticket-1',
      status: 'PAID',
      assignedTo: 'admin-1',
      expectedResponseAt: null,
    })).rejects.toThrow('Trạng thái support ticket không hợp lệ');
  });
});
