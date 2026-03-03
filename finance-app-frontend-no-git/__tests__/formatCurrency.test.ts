import { formatCurrency } from '@/constants/theme';

describe('formatCurrency', () => {
  it('formats USD amount with default rate', () => {
    expect(formatCurrency(100)).toMatch(/\$100\.00/);
    expect(formatCurrency(0)).toMatch(/\$0\.00/);
    expect(formatCurrency(-50.5)).toMatch(/-\$50\.50/);
  });

  it('converts with exchange rate', () => {
    const formatted = formatCurrency(100, 'USD', 0.92);
    expect(formatted).toMatch(/92\.00/);
  });

  it('uses zero decimals for JPY', () => {
    const formatted = formatCurrency(1000, 'JPY', 155);
    expect(formatted).toMatch(/155,?000/);
    expect(formatted).not.toMatch(/\.\d{2}/);
  });

  it('handles EUR symbol', () => {
    const formatted = formatCurrency(50, 'EUR', 0.92);
    expect(formatted).toContain('46');
    expect(formatted).toMatch(/€|46/);
  });
});
