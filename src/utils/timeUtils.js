/** Định dạng số giây thành "Còn khoảng X phút" hoặc "Còn khoảng X giờ Y phút" */
export function formatEtaDuration(seconds) {
  if (seconds == null) return null;
  const totalMinutes = Math.round(seconds / 60);
  if (totalMinutes < 1) return 'Còn dưới 1 phút';
  if (totalMinutes < 60) return `Còn khoảng ${totalMinutes} phút`;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return minutes > 0 ? `Còn khoảng ${hours} giờ ${minutes} phút` : `Còn khoảng ${hours} giờ`;
}

/** Định dạng thời điểm hoàn thành dự kiến, ví dụ "Hoàn thành lúc 22:45" */
export function formatEtaClockTime(seconds) {
  if (seconds == null) return null;
  const finishAt = new Date(Date.now() + seconds * 1000);
  const hh = String(finishAt.getHours()).padStart(2, '0');
  const mm = String(finishAt.getMinutes()).padStart(2, '0');
  return `Hoàn thành lúc ${hh}:${mm}`;
}

/** Định dạng giá tiền VND, ví dụ 45000 -> "45.000đ" */
export function formatPriceVnd(amount) {
  if (amount == null) return null;
  return `${amount.toLocaleString('vi-VN')}đ`;
}

/** Định dạng thời lượng đã render, ví dụ 185 -> "3 phút 5 giây" */
export function formatDuration(seconds) {
  if (seconds == null) return null;
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (minutes === 0) return `${secs} giây`;
  return `${minutes} phút ${secs} giây`;
}

/** Định dạng thời điểm tạo job dạng tương đối, ví dụ "2 giờ trước" */
export function formatRelativeTime(timestampMs) {
  const diffMs = Date.now() - timestampMs;
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'Vừa xong';
  if (diffMin < 60) return `${diffMin} phút trước`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour} giờ trước`;
  const diffDay = Math.floor(diffHour / 24);
  return `${diffDay} ngày trước`;
}
