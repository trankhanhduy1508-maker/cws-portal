/**
 * KHỚP CHÍNH XÁC với RENDER_PROFILES trong
 * cws-portal/src/constants/renderConstants.js.
 *
 * Đây là nơi DUY NHẤT định nghĩa hệ số tính ETA/giá — nếu Portal cũng
 * cần hiển thị lại các con số này ở đâu đó ngoài kết quả API, cần đối
 * chiếu lại file renderConstants.js phía Portal để đảm bảo đồng bộ.
 */
export enum RenderProfileId {
  ECONOMY = 'economy',
  STANDARD = 'standard',
  PRIORITY = 'priority',
  TURBO = 'turbo',
}

export interface RenderProfileDefinition {
  id: RenderProfileId;
  durationMultiplier: number;
  costMultiplier: number;
  queueMultiplier: number;
}

export const RENDER_PROFILES: Record<RenderProfileId, RenderProfileDefinition> = {
  [RenderProfileId.ECONOMY]: {
    id: RenderProfileId.ECONOMY,
    durationMultiplier: 1.8,
    costMultiplier: 0.6,
    queueMultiplier: 2.2,
  },
  [RenderProfileId.STANDARD]: {
    id: RenderProfileId.STANDARD,
    durationMultiplier: 1.0,
    costMultiplier: 1.0,
    queueMultiplier: 1.0,
  },
  [RenderProfileId.PRIORITY]: {
    id: RenderProfileId.PRIORITY,
    durationMultiplier: 0.65,
    costMultiplier: 1.6,
    queueMultiplier: 0.4,
  },
  [RenderProfileId.TURBO]: {
    id: RenderProfileId.TURBO,
    durationMultiplier: 0.4,
    costMultiplier: 2.4,
    queueMultiplier: 0.1,
  },
};

export function isValidRenderProfileId(value: string): value is RenderProfileId {
  return Object.values(RenderProfileId).includes(value as RenderProfileId);
}
