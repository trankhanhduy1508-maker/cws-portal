import sharp from 'sharp';

/** Watermark lặp chéo toàn ảnh, nội dung "CWS RENDER" (CWS_ROADMAP_MVP_V1.md, Giai đoạn 4). */
export async function applyDiagonalWatermark(imageBuffer: Buffer): Promise<Buffer> {
  const image = sharp(imageBuffer);
  const meta = await image.metadata();
  const width = meta.width ?? 1920;
  const height = meta.height ?? 1080;

  const svg = buildWatermarkSvg(width, height, 'CWS RENDER');

  return image
    .composite([{ input: Buffer.from(svg), top: 0, left: 0 }])
    .png()
    .toBuffer();
}

function buildWatermarkSvg(width: number, height: number, text: string): string {
  const stepX = 260;
  const stepY = 160;
  const cols = Math.ceil(width / stepX) + 2;
  const rows = Math.ceil(height / stepY) + 2;

  let tiles = '';
  for (let row = -1; row < rows; row++) {
    for (let col = -1; col < cols; col++) {
      const x = col * stepX;
      const y = row * stepY;
      tiles += `<text x="${x}" y="${y}" transform="rotate(-30 ${x} ${y})" font-size="26" font-family="sans-serif" font-weight="700" fill="rgba(255,255,255,0.32)" stroke="rgba(0,0,0,0.25)" stroke-width="0.5">${text}</text>`;
    }
  }

  return `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">${tiles}</svg>`;
}
