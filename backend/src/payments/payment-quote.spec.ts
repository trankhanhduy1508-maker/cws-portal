import { RenderProfileId } from '../jobs/domain/render-profile';
import { calculateExpectedAmountVnd } from './payment-quote';

describe('calculateExpectedAmountVnd', () => {
  it('derives the amount server-side from profile and file size', () => {
    expect(calculateExpectedAmountVnd(RenderProfileId.STANDARD, 100 * 1024 * 1024)).toBe(38000);
  });
  it('applies the profile multiplier', () => {
    expect(calculateExpectedAmountVnd(RenderProfileId.TURBO, 100 * 1024 * 1024)).toBe(91000);
  });
});
