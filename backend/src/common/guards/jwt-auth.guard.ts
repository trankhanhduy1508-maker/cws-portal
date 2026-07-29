import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';
import { Request } from 'express';
import { AppConfig } from '../../config/configuration';
import { AuthPrincipal, AuthRole } from '../auth-principal';

interface CwsJwtPayload extends jwt.JwtPayload {
  role?: string;
  app_metadata?: { role?: string };
}

export type AuthenticatedRequest = Request & { user: AuthPrincipal };

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly configService: ConfigService<AppConfig, true>) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const authHeader = request.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Thiếu Bearer token');
    }

    try {
      const payload = jwt.verify(
        authHeader.slice('Bearer '.length),
        this.configService.get('jwtSecret', { infer: true }),
      ) as CwsJwtPayload;
      if (!payload.sub) throw new UnauthorizedException('Token thiếu subject');
      const rawRole = payload.app_metadata?.role ?? payload.role;
      const role: AuthRole = rawRole === 'admin' ? 'admin' : 'customer';
      (request as AuthenticatedRequest).user = { userId: payload.sub, role };
      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error;
      throw new UnauthorizedException('Token không hợp lệ hoặc đã hết hạn');
    }
  }
}
