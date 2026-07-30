import { Injectable, Logger } from '@nestjs/common';
import { mkdtemp, writeFile, readFile, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { isFfmpegAvailable, runFfmpeg } from './ffmpeg.util';

const FRAME_NUMBER_PATTERN = /(\d+)(?=\.\w+$)/; // số cuối cùng trước phần mở rộng, vd renders/.../frame_0042.png -> 42

export interface FrameFile {
  key: string;
  buffer: Buffer;
}

/**
 * Tự động ghép các frame PNG đã render thành 1 file video MP4 (file
 * CUỐI khách tải về sau khi thanh toán — KHÔNG liên quan tới bước xem
 * trước, roadmap vẫn dùng 3-5 ảnh watermark tĩnh qua PreviewService,
 * "Không thuộc MVP: Video preview đầy đủ" chỉ áp dụng cho bước preview
 * đó, không áp dụng cho định dạng file cuối).
 *
 * GIỚI HẠN THẬT (ghi rõ, không giả vờ): cần ffmpeg cài sẵn trên môi
 * trường chạy Backend (Render/VPS) — nếu thiếu, trả về `null` và
 * PackagingService rơi về .zip frame PNG như hành vi cũ, KHÔNG làm
 * hỏng cả job. Toàn bộ frame được giữ trong RAM để ghi ra thư mục tạm
 * cho ffmpeg đọc — chấp nhận được ở quy mô MVP, không phù hợp cho
 * render hàng chục nghìn frame độ phân giải cao (cải tiến sau nếu cần).
 */
@Injectable()
export class VideoAssemblyService {
  private readonly logger = new Logger(VideoAssemblyService.name);

  async isAvailable(): Promise<boolean> {
    return isFfmpegAvailable();
  }

  async buildVideo(frames: FrameFile[], fps: number): Promise<Buffer | null> {
    if (!(await this.isAvailable())) {
      this.logger.warn(
        'ffmpeg KHÔNG có sẵn trên môi trường chạy Backend — bỏ qua bước dựng video, ' +
          'dùng .zip frame PNG (xem BACKEND_SETUP.md để cài ffmpeg).',
      );
      return null;
    }

    const sorted = [...frames].sort(
      (a, b) => this.extractFrameNumber(a.key) - this.extractFrameNumber(b.key),
    );
    const dir = await mkdtemp(join(tmpdir(), 'cws-render-'));

    try {
      await Promise.all(
        sorted.map((frame, index) =>
          writeFile(join(dir, `frame_${String(index + 1).padStart(8, '0')}.png`), frame.buffer),
        ),
      );

      const videoPath = join(dir, 'output.mp4');
      await runFfmpeg([
        '-y',
        '-framerate',
        String(fps),
        '-i',
        join(dir, 'frame_%08d.png'),
        '-c:v',
        'libx264',
        '-pix_fmt',
        'yuv420p',
        videoPath,
      ]);
      return await readFile(videoPath);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  }

  private extractFrameNumber(key: string): number {
    const match = FRAME_NUMBER_PATTERN.exec(key);
    return match ? parseInt(match[1], 10) : 0;
  }
}
