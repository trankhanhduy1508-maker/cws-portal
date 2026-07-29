import { RENDER_PROFILES, RenderProfileId } from '../jobs/domain/render-profile';

export function calculateExpectedAmountVnd(
  profileId: RenderProfileId,
  fileSizeBytes: number | null,
): number {
  const profile = RENDER_PROFILES[profileId];
  const sizeMb = fileSizeBytes ? fileSizeBytes / (1024 * 1024) : 80;
  const baseCostVnd = Math.max(15000, sizeMb * 380);
  return Math.round((baseCostVnd * profile.costMultiplier) / 1000) * 1000;
}
