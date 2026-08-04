import { useCallback, useEffect, useState } from 'react';
import { LifeBuoy } from 'lucide-react';
import { createSupportTicket, listSupportTickets } from '../services/RenderService';

const STATUS_LABEL = {
  OPEN: 'Mới mở',
  ACKNOWLEDGED: 'Đã tiếp nhận',
  IN_PROGRESS: 'Đang xử lý',
  RESOLVED: 'Đã xử lý',
  DECLINED: 'Không thể xử lý',
};

export default function SupportPanel({ jobId = null }) {
  const [tickets, setTickets] = useState([]);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState(null);
  const [sent, setSent] = useState(null);

  const loadTickets = useCallback(() => {
    setIsLoading(true);
    listSupportTickets()
      .then((data) => setTickets(data.tickets ?? []))
      .catch((err) => setError(err.message))
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => { loadTickets(); }, [loadTickets]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!subject.trim() || !message.trim()) {
      setError('Vui lòng nhập chủ đề và nội dung.');
      return;
    }
    setError(null);
    setSent(null);
    setIsSending(true);
    try {
      const ticket = await createSupportTicket({ subject, message, jobId });
      setTickets((current) => [ticket, ...current]);
      setSubject('');
      setMessage('');
      setSent(ticket.ticketCode);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <section style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid #E8E8EA' }} aria-label="Yêu cầu hỗ trợ">
      <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'Space Grotesk', fontSize: 16, fontWeight: 600 }}>
        <LifeBuoy size={18} /> Yêu cầu hỗ trợ
      </h3>
      <p style={{ fontSize: 12.5, color: '#6B6B70' }}>
        Gửi yêu cầu trong hệ thống và giữ lại mã yêu cầu để theo dõi trạng thái.
      </p>

      <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 8 }}>
        <input
          value={subject}
          onChange={(event) => setSubject(event.target.value)}
          maxLength={160}
          placeholder="Chủ đề"
          aria-label="Chủ đề hỗ trợ"
          style={{ padding: 10, borderRadius: 8, border: '1px solid #E8E8EA' }}
        />
        <textarea
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          maxLength={4000}
          rows={3}
          placeholder="Mô tả vấn đề"
          aria-label="Nội dung hỗ trợ"
          style={{ padding: 10, borderRadius: 8, border: '1px solid #E8E8EA', resize: 'vertical' }}
        />
        <button type="submit" disabled={isSending} style={{ justifySelf: 'start', padding: '8px 12px', border: 0, borderRadius: 8, background: '#1C1C1E', color: '#fff', cursor: 'pointer' }}>
          {isSending ? 'Đang gửi...' : 'Gửi yêu cầu'}
        </button>
      </form>

      {error && <p style={{ color: '#D64545', fontSize: 13 }}>{error}</p>}
      {sent && <p style={{ color: '#2E7D32', fontSize: 13 }}>Đã tạo yêu cầu {sent}.</p>}

      <div style={{ marginTop: 14 }}>
        <strong style={{ fontSize: 13 }}>Yêu cầu đã gửi</strong>
        {isLoading && <p style={{ fontSize: 13, color: '#6B6B70' }}>Đang tải...</p>}
        {!isLoading && tickets.length === 0 && <p style={{ fontSize: 13, color: '#6B6B70' }}>Chưa có yêu cầu nào.</p>}
        {tickets.map((ticket) => (
          <div key={ticket.id} style={{ marginTop: 8, padding: 10, borderRadius: 8, background: '#F7F7F8', fontSize: 13 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
              <strong>{ticket.ticketCode}</strong>
              <span>{STATUS_LABEL[ticket.status] || ticket.status}</span>
            </div>
            <div style={{ marginTop: 3 }}>{ticket.subject}</div>
            {ticket.expectedResponseAt && (
              <div style={{ marginTop: 3, color: '#6B6B70' }}>
                Dự kiến phản hồi: {new Date(ticket.expectedResponseAt).toLocaleString('vi-VN')}
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
