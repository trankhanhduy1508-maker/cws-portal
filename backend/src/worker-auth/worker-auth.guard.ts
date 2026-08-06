import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Request } from 'express';
import { WorkerAuthService } from './worker-auth.service';

@Injectable()
export class WorkerAuthGuard implements CanActivate {
  constructor(private readonly workerAuthService: WorkerAuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    request.workerIdentity = await this.workerAuthService.authenticate(request);
    return true;
  }
}
