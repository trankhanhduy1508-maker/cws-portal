import { Inject, Injectable, Logger } from '@nestjs/common';
import { Server as HttpServer, IncomingMessage } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { SupabaseService } from '../supabase/supabase.service';
import {
  IRenderOrdersRepository,
  RENDER_ORDERS_REPOSITORY,
} from '../jobs/repositories/render-orders.repository.interface';
import { toPublicJson } from '../jobs/render-order.presenter';
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
      this.wss!.handleUpgrade(request, socket, head, (client) => {
        this.handleConnection(client, jobId);
      });
    });

    this.logger.log('JobsRealtimeServer đã gắn vào HTTP server, lắng nghe /ws/jobs/:id');
  }

  private async handleConnection(client: WebSocket, jobId: string): Promise<void> {
    this.logger.log(`Client kết nối realtime cho job ${jobId}`);

    // Gửi ngay snapshot hiện tại — khớp đúng hành vi mockSubscribeToJob
    // (Portal không bị "trống" nếu vừa kết nối lại giữa chừng).
    try {
      const current = await this.ordersRepository.findById(jobId);
      if (current && client.readyState === client.OPEN) {
        client.send(JSON.stringify(toPublicJson(current)));
      }
    } catch (err) {
      this.logger.error(`Không lấy được snapshot ban đầu cho job ${jobId}: ${String(err)}`);
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
              this.logger.error(`Lỗi khi forward realtime update cho job ${jobId}: ${String(err)}`);
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
