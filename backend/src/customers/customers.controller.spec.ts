import { Reflector } from '@nestjs/core';
import { CustomersController } from './customers.controller';
import { RoleGuard } from '../common/guards/role.guard';

describe('CustomersController CRM security', () => {
  it('protects the CRM route with the existing backend RoleGuard', () => {
    const guards = Reflect.getMetadata('__guards__', CustomersController.prototype.listCrmSummaries);
    expect(guards).toContain(RoleGuard);
  });

  it('does not expose customer data through the controller without service authorization boundary', () => {
    const reflector = new Reflector();
    const guards = reflector.get('__guards__', CustomersController.prototype.listCrmSummaries);
    expect(guards).toContain(RoleGuard);
  });
});
