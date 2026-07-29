import { BadRequestException } from '@nestjs/common';
import { parseOperationsQuery } from './operations-query';

describe('parseOperationsQuery', () => {
  it('uses bounded defaults', () => {
    expect(parseOperationsQuery({})).toEqual({
      page: 1, pageSize: 25, search: '', jobStatus: undefined, paymentStatus: undefined,
    });
  });

  it('accepts canonical filters and trims search', () => {
    expect(parseOperationsQuery({
      page: '2', pageSize: '50', search: '  demo  ', jobStatus: 'rendering', paymentStatus: 'confirmed',
    })).toMatchObject({ page: 2, pageSize: 50, search: 'demo' });
  });

  it.each([
    { page: '0' }, { pageSize: '101' }, { jobStatus: 'hacked' }, { paymentStatus: 'paid' },
  ])('rejects invalid query %#', (query) => {
    expect(() => parseOperationsQuery(query)).toThrow(BadRequestException);
  });
});
