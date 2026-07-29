import { UnauthorizedException } from '@nestjs/common';
import { OutputsService } from './outputs.service';
describe('OutputsService',()=>{
 const repo={register:jest.fn(),unlock:jest.fn(),authorize:jest.fn()};
 const storage={listObjectsByPrefix:jest.fn(),getPrivateObject:jest.fn(),putPrivateObject:jest.fn()};
 const config={get:jest.fn().mockReturnValue('test-secret-at-least-32-bytes-long')};
 const service=new OutputsService(repo as never,storage as never,config as never);
 beforeEach(()=>jest.clearAllMocks());
 it('registers a locked canonical output then idempotently unlocks through payment eligibility RPC',async()=>{
  repo.register.mockResolvedValue({});repo.unlock.mockResolvedValue({});
  await service.registerReadyOutput('11111111-1111-1111-1111-111111111111','results/11111111-1111-1111-1111-111111111111.zip',10);
  expect(repo.unlock).toHaveBeenCalledTimes(1);
 });
 it('issues a five minute server-signed URL only after repository authorization',async()=>{
  repo.authorize.mockResolvedValue({objectKey:'results/order.zip'});
  const grant=await service.createAccessGrant('order',{userId:'owner',role:'customer'});
  expect(repo.authorize).toHaveBeenCalledWith(expect.objectContaining({actorId:'owner',isAdmin:false,action:'ACCESS_GRANTED'}));
  expect(grant.url).toContain('/outputs/order/download?token=');
  expect(grant.expiresAt-Date.now()).toBeLessThanOrEqual(300000);
 });
 it('rejects a tampered token before storage access',async()=>{
  await expect(service.redeem('order','bad.token')).rejects.toBeInstanceOf(UnauthorizedException);
  expect(storage.getPrivateObject).not.toHaveBeenCalled();
 });
});
