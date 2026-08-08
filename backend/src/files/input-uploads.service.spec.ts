import {
  ForbiddenException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InputUploadsService } from './input-uploads.service';

function query(result: { data: unknown; error: unknown }) {
  const chain: any = {
    insert: jest.fn().mockResolvedValue({ error: result.error }),
    select: jest.fn(),
    eq: jest.fn(),
    maybeSingle: jest.fn().mockResolvedValue(result),
  };
  chain.select.mockReturnValue(chain);
  chain.eq.mockReturnValue(chain);
  return chain;
}

describe('InputUploadsService', () => {
  it('records ownership without returning storage credentials', async () => {
    const table = query({ data: null, error: null });
    const service = new InputUploadsService({
      getClient: () => ({ from: () => table }),
    } as never);

    await service.record('uploads/id-scene.blend', 'customer-a', 'scene.blend', 42);

    expect(table.insert).toHaveBeenCalledWith({
      object_key: 'uploads/id-scene.blend',
      customer_id: 'customer-a',
      original_name: 'scene.blend',
      size_bytes: 42,
    });
  });

  it('accepts only an object owned by the authenticated customer', async () => {
    const owned = query({ data: { object_key: 'uploads/a.blend' }, error: null });
    const service = new InputUploadsService({
      getClient: () => ({ from: () => owned }),
    } as never);
    await expect(
      service.assertOwned('uploads/a.blend', 'customer-a'),
    ).resolves.toBeUndefined();
    expect(owned.eq).toHaveBeenNthCalledWith(1, 'object_key', 'uploads/a.blend');
    expect(owned.eq).toHaveBeenNthCalledWith(2, 'customer_id', 'customer-a');

    const missing = query({ data: null, error: null });
    const denied = new InputUploadsService({
      getClient: () => ({ from: () => missing }),
    } as never);
    await expect(
      denied.assertOwned('uploads/a.blend', 'customer-b'),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('fails closed when the ownership store is unavailable', async () => {
    const failed = query({ data: null, error: new Error('db') });
    const service = new InputUploadsService({
      getClient: () => ({ from: () => failed }),
    } as never);
    await expect(
      service.assertOwned('uploads/a.blend', 'customer-a'),
    ).rejects.toBeInstanceOf(InternalServerErrorException);
  });
});
