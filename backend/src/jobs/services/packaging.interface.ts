/**
 * Token/interface tách riêng khỏi class PackagingService thật (xem
 * scheduler/packaging.service.ts) — lý do KHÔNG import thẳng class đó
 * ở đây: packaging.service.ts import 'archiver' (package ESM-only),
 * khiến ts-jest lỗi "Cannot use import statement outside a module"
 * bất kỳ khi nào 1 file bị Jest load transitive tới nó (vd
 * jobs.service.spec.ts trước đây). Dùng token tách rời để JobsService
 * (và spec của nó) không kéo theo 'archiver' vào cây import khi test.
 */
export const PACKAGING_SERVICE = Symbol('PACKAGING_SERVICE');

export interface IPackagingService {
  /** `fps` (từ WorkerFleetGateway.getJobMeta(), Worker tự ghi lại) dùng
   * để ghép video đúng tốc độ nếu có ffmpeg — không đoán fps. */
  packageRenderResult(
    internalJobId: string,
    renderOrderId: string,
    fps: number,
  ): Promise<{ downloadUrl: string; resultSizeBytes: number }>;
}
