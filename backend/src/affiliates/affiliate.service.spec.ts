import { commissionVnd, withdrawalMinimumVnd } from './affiliate.service';

describe('Affiliate MVP business rules', () => {
  it('first successful withdrawal minimum is 50,000 VND', () => {
    expect(withdrawalMinimumVnd(0)).toBe(50_000);
    expect(withdrawalMinimumVnd(0) <= 49_999).toBe(false);
    expect(withdrawalMinimumVnd(0) <= 50_000).toBe(true);
  });

  it('subsequent withdrawal minimum is 200,000 VND', () => {
    expect(withdrawalMinimumVnd(1)).toBe(200_000);
    expect(withdrawalMinimumVnd(1) <= 199_999).toBe(false);
    expect(withdrawalMinimumVnd(1) <= 200_000).toBe(true);
  });

  it('commission is exactly 10% with VND floor rounding', () => {
    expect(commissionVnd(450_000)).toBe(45_000);
    expect(commissionVnd(99)).toBe(9);
  });
});
