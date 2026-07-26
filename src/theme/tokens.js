// CWS Customer Portal — Design Tokens
// Triết lý: sáng, hiện đại, lấy cảm hứng từ chính "ánh sáng render"
// Tránh 3 default look phổ biến của AI-generated design (cream+serif,
// dark+neon, broadsheet) — dùng xanh cobalt kỹ thuật thay vì xanh SaaS chung.

export const colors = {
  bg: '#FAFAF9',           // nền chính, trắng ấm rất nhẹ
  bgElevated: '#FFFFFF',   // card nổi trên nền
  ink: '#1C1C1E',          // text chính
  inkMuted: '#6B6B70',     // text phụ
  inkFaint: '#B0B0B5',     // placeholder, disabled
  accent: '#3B5BFF',       // cobalt — màu chủ đạo, "render engine"
  accentSoft: '#EEF0FF',   // nền nhạt cho accent (card chọn, hover)
  accentDeep: '#2540CC',   // hover/active state của accent
  success: '#2AB673',
  successSoft: '#E3F7ED',
  warning: '#E0932C',
  warningSoft: '#FBF0DF',
  danger: '#E5484D',
  dangerSoft: '#FDECEC',
  border: '#E8E8EA',
  borderStrong: '#D4D4D8',
};

export const fonts = {
  display: "'Space Grotesk', sans-serif",
  body: "'Inter', sans-serif",
  mono: "'JetBrains Mono', monospace",
};

export const radius = {
  sm: '10px',
  md: '16px',
  lg: '24px',
  full: '999px',
};

export const shadow = {
  card: '0 1px 2px rgba(28,28,30,0.04), 0 8px 24px rgba(28,28,30,0.06)',
  raised: '0 2px 8px rgba(28,28,30,0.06), 0 16px 40px rgba(28,28,30,0.10)',
  accent: '0 8px 24px rgba(59,91,255,0.24)',
};
