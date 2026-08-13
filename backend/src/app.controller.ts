import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  @Get('health')
  health() {
    const commitSha =
      process.env.RENDER_GIT_COMMIT ??
      process.env.VERCEL_GIT_COMMIT_SHA ??
      process.env.GIT_COMMIT_SHA ??
      null;

    return {
      status: 'ok',
      service: 'cws-backend',
      commitSha,
      timestamp: new Date().toISOString(),
    };
  }
}
