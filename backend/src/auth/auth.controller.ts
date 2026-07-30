import { Controller, Get, Query, Res } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Response } from 'express';
import { AppConfig } from '../config/configuration';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService<AppConfig, true>,
  ) {}

  /** Điểm bắt đầu đăng nhập — Portal đặt nút "Đăng nhập với Facebook" trỏ tới route này. */
  @Get('facebook')
  facebookLogin(@Res() res: Response) {
    const url = this.authService.getFacebookAuthorizeUrl();
    res.redirect(url);
  }

  /** Facebook redirect khách về đây sau khi đăng nhập xong. */
  @Get('facebook/callback')
  async facebookCallback(@Query('code') code: string, @Res() res: Response) {
    const { token, customerId } = await this.authService.handleFacebookCallback(code);

    const frontendUrl = this.configService.get('frontendUrl', { infer: true });
    if (!frontendUrl || frontendUrl === '*') {
      // Chưa cấu hình FRONTEND_URL — trả JSON thay vì redirect tới URL
      // không hợp lệ, vẫn đủ để test thủ công qua curl/Postman.
      res.json({ token, customerId });
      return;
    }
    res.redirect(`${frontendUrl}?token=${encodeURIComponent(token)}`);
  }
}
