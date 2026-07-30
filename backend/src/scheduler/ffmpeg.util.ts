import { spawn } from 'child_process';

/**
 * Kiểm tra ffmpeg CLI có sẵn trên môi trường đang chạy Backend hay
 * không (Render.com/VPS cần cài đặt riêng — xem BACKEND_SETUP.md).
 * KHÔNG giả định luôn có — nếu thiếu, PackagingService rơi về đóng gói
 * .zip frame PNG như hành vi cũ, không giả vờ đã dựng video.
 */
export function isFfmpegAvailable(): Promise<boolean> {
  return new Promise((resolve) => {
    const proc = spawn('ffmpeg', ['-version']);
    proc.on('error', () => resolve(false));
    proc.on('exit', (code) => resolve(code === 0));
  });
}

/** Chạy 1 lệnh ffmpeg, reject kèm phần cuối stderr nếu thoát khác 0 —
 * để log lỗi thật, không nuốt lỗi âm thầm. */
export function runFfmpeg(args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn('ffmpeg', args);
    let stderr = '';
    proc.stderr.on('data', (chunk: Buffer) => {
      stderr += chunk.toString();
    });
    proc.on('error', (err) => reject(err));
    proc.on('exit', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`ffmpeg thoát với mã ${code}: ${stderr.slice(-2000)}`));
    });
  });
}
