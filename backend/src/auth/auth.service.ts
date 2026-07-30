import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';
import { AppConfig } from '../config/configuration';
import { CustomersService } from '../customers/customers.service';

interface FacebookTokenResponse {
  access_token?: string;
}

interface FacebookProfileResponse {
  id: string;
  name?: string;
  email?: string;
  picture?: { data?: { url?: string } };
}

/**
 * Facebook Login (CWS_MVP_WORKFLOW_FINAL.md — "Chỉ dùng Facebook
 * Login"). GIỚI HẠN THẬT: FACEBOOK_APP_ID/SECRET chưa được cấu hình
 * trong môi trường phát triển này — mọi hàm ở đây báo lỗi rõ ràng
 * (không bịa) cho tới khi có App ID/Secret thật. Khi có: chỉ cần điền
 * 3 biến FACEBOOK_APP_ID/FACEBOOK_APP_SECRET/FACEBOOK_CALLBACK_URL,
 * KHÔNG cần sửa code (giống pattern GOOGLE_DRIVE_API_KEY).
 */
@Injectable()
export class AuthService {
  constructor(
    private readonly configService: ConfigService<AppConfig, true>,
    private readonly customersService: CustomersService,
  ) {}

  getFacebookAuthorizeUrl(): string {
    const { appId, callbackUrl } = this.configService.get('facebook', { infer: true });
    if (!appId || !callbackUrl) {
      throw new BadRequestException(
        'Facebook Login chưa được cấu hình — thiếu FACEBOOK_APP_ID/FACEBOOK_CALLBACK_URL trong biến môi trường.',
      );
    }

    const params = new URLSearchParams({
      client_id: appId,
      redirect_uri: callbackUrl,
      scope: 'email,public_profile',
      response_type: 'code',
    });
    return `https://www.facebook.com/v19.0/dialog/oauth?${params.toString()}`;
  }

  async handleFacebookCallback(code: string): Promise<{ token: string; customerId: string }> {
    const { appId, appSecret, callbackUrl } = this.configService.get('facebook', { infer: true });
    if (!appId || !appSecret || !callbackUrl) {
      throw new BadRequestException(
        'Facebook Login chưa được cấu hình — thiếu FACEBOOK_APP_ID/FACEBOOK_APP_SECRET/FACEBOOK_CALLBACK_URL.',
      );
    }
    if (!code) {
      throw new BadRequestException('Thiếu tham số "code" từ Facebook callback.');
    }

    const tokenParams = new URLSearchParams({
      client_id: appId,
      client_secret: appSecret,
      redirect_uri: callbackUrl,
      code,
    });
    const tokenRes = await fetch(`https://graph.facebook.com/v19.0/oauth/access_token?${tokenParams.toString()}`);
    if (!tokenRes.ok) {
      throw new BadRequestException('Không đổi được "code" lấy access token từ Facebook.');
    }
    const tokenData = (await tokenRes.json()) as FacebookTokenResponse;
    if (!tokenData.access_token) {
      throw new BadRequestException('Facebook không trả về access_token.');
    }

    const profileParams = new URLSearchParams({
      fields: 'id,name,email,picture',
      access_token: tokenData.access_token,
    });
    const profileRes = await fetch(`https://graph.facebook.com/me?${profileParams.toString()}`);
    if (!profileRes.ok) {
      throw new BadRequestException('Không lấy được hồ sơ Facebook.');
    }
    const profile = (await profileRes.json()) as FacebookProfileResponse;

    const customer = await this.customersService.loginWithFacebook({
      facebookId: profile.id,
      fullName: profile.name ?? null,
      email: profile.email ?? null,
      avatarUrl: profile.picture?.data?.url ?? null,
    });

    const jwtSecret = this.configService.get('jwtSecret', { infer: true });
    const token = jwt.sign({ sub: customer.id }, jwtSecret, { expiresIn: '30d' });

    return { token, customerId: customer.id };
  }
}
