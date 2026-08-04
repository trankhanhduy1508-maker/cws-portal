import { Inject, Injectable, Logger } from '@nestjs/common';
import { Server as HttpServer, IncomingMessage } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { SupabaseService } from '../supabase/supabase.service';
import {
  IRenderOrdersRepository,
  RENDER_ORDERS_REPOSITORY,
} from '../jobs/repositories/render-orders.repository.interface';
import { toPublicJson } from '../jobs/render-order.presenter';
import { RealtimeAccessTicketService } from './realtime-access-ticket.service';
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';

const PATH_PATTERN = /^\/ws\/jobs\/([^/?]+)/;

/**
 * Bridge WebSocket THÔ (đúng những gì Portal đã tự viết sẵn trong
 * RenderService.js: `new WebSocket(url)`, `onmessage` nhận JSON thô,
 * kiểm tra `data.status === 'finished'`) sang Supabase Realtime.
 *
 * LÝ DO không dùng @nestjs/websockets Gateway chuẩn: Gateway của Nest
 * không hỗ trợ tốt việc tách jobId ra từ PATH động dạng
 * `/ws/jobs/:jobId` (Portal đã hard-code path này, không được đổi).
 * Cách đơn giản, đúng chuẩn Node.js là tự lắng nghe sự kiện 'upgrade'
 * của chính HTTP server — không phát minh giao thức mới, chỉ dùng
 * đúng API chuẩn của thư viện `ws`.
 *
 * Nguồn dữ liệu THẬT là Supabase Realtime (subscribe thay đổi trên
 * bảng `render_orders`) — đúng yêu cầu "ưu tiên Supabase Realtime,
 * không tự xây WebSocket Server nếu không cần". Phần WebSocket ở đây
 * chỉ là lớp "phiên dịch" mỏng để khớp với contract Portal đã viết sẵn,
 * không phải tự xây lại cơ chế phát hiện thay đổi.
 */
@Injectable()
export class JobsRealtimeServer {
  private readonly logger = new Logger(JobsRealtimeServer.name);
  private wss?: WebSocketServer;

  constructor(
    private readonly supabaseService: SupabaseService,
    @Inject(RENDER_ORDERS_REPOSITORY)
    private readonly ordersRepository: IRenderOrdersRepository,
    private readonly ticketService: RealtimeAccessTicketService,
  ) {}

  attach(httpServer: HttpServer): void {
    this.wss = new WebSocketServer({ noServer: true });

    httpServer.on('upgrade', (request: IncomingMessage, socket, head) => {
      const url = request.url ?? '';
      const match = PATH_PATTERN.exec(url);
      if (!match) {
        // Không phải đường dẫn realtime job — để nguyên cho phần khác
        // xử lý (hiện tại app không có WS nào khác nên đóng an toàn).
        socket.destroy();
        return;
      }
      const jobId = match[1];
      // Chỉ nhận opaque one-time ticket; Supabase bearer token không
      // bao giờ đi vào URL/WebSocket handshake.
      const ticket = new URL(url, 'http://localhost').searchParams.get('ticket');
      this.wss!.handleUpgrade(request, socket, head, (client) => {
        this.handleConnection(client, jobId, ticket);
      });
    });

    this.logger.log(
      'JobsRealtimeServer đã gắn vào HTTP server, lắng nghe /ws/jobs/:id',
    );
  }

  /**
   * Cùng nguyên tắc kiểm tra chủ sở hữu với JobsService.assertOwnership()
   * (xem jobs.service.ts) — trước đây route WebSocket này gửi TOÀN BỘ
   * snapshot job (customerId/software/notes/finalPriceVnd...) cho BẤT KỲ
   * ai kết nối biết job id, bỏ qua hoàn toàn việc kiểm tra ở tầng REST.
   * Job có customerId -> bắt buộc token khớp đúng khách đó, đóng kết nối
   * ngay (KHÔNG gửi dữ liệu nào) nếu không khớp. Job chưa có customerId
   * (khách vãng lai) vẫn mở, giữ nguyên hành vi cũ.
   */
  private async handleConnection(
    client: WebSocket,
    jobId: string,
    ticket: string | null,
  ): Promise<void> {
    this.logger.log(`Client kết nối realtime cho job ${jobId}`);

    let current;
    try {
      current = await this.ordersRepository.findById(jobId);
    } catch (err) {
      this.logger.error(
        `Không lấy được snapshot ban đầu cho job ${jobId}: ${String(err)}`,
      );
      current = null;
    }

    if (!current?.customerId) {
      client.close(4003, 'Job chưa có owner hợp lệ');
      return;
    }
    const customerId = await this.ticketService.consume(ticket, jobId);
    if (customerId !== current.customerId) {
      this.logger.warn(
        `Từ chối kết nối realtime cho job ${jobId} — ticket không hợp lệ/hết hạn/đã dùng`,
      );
      client.close(4003, 'Không có quyền truy cập job này');
      return;
    }

    // SỬA (phát hiện qua tự rà soát 31/07/2026): job KHÔNG tồn tại (id
    // sai/không có thật, vd ai đó dò URL ngẫu nhiên) trước đây vẫn mở 1
    // kênh Supabase Realtime SỐNG mãi tới khi client tự đóng — không rò
    // rỉ dữ liệu gì (không job nào để gửi), nhưng lãng phí tài nguyên
    // không cần thiết. Đóng kết nối ngay, không mở kênh, nếu job không
    // tồn tại (client thật luôn có job thật vì `createJob()` await xong
    // mới gọi subscribe, xem `useRenderJob.js#start()`).
    if (!current) {
      client.close(4004, 'Không tìm thấy job này');
      return;
    }

    // Gửi ngay snapshot hiện tại — khớp đúng hành vi mockSubscribeToJob
    // (Portal không bị "trống" nếu vừa kết nối lại giữa chừng).
    if (client.readyState === client.OPEN) {
      client.send(JSON.stringify(toPublicJson(current)));
    }

    const channel = this.supabaseService
      .getClient()
      .channel(`render_orders:${jobId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'render_orders',
          filter: `id=eq.${jobId}`,
        },
        (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
          if (client.readyState !== client.OPEN) return;
          this.ordersRepository
            .findById(jobId)
            .then((order) => {
              if (order && client.readyState === client.OPEN) {
                client.send(JSON.stringify(toPublicJson(order)));
              }
            })
            .catch((err: unknown) => {
              this.logger.error(
                `Lỗi khi forward realtime update cho job ${jobId}: ${String(err)}`,
              );
            });
          void payload;
        },
      )
      .subscribe();

    client.on('close', () => {
      this.logger.log(`Client ngắt kết nối realtime cho job ${jobId}`);
      void channel.unsubscribe();
    });

    client.on('error', (err: Error) => {
      this.logger.error(`Lỗi WebSocket cho job ${jobId}: ${err.message}`);
    });
  }
}
