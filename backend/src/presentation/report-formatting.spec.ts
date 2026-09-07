import { describe, expect, it } from 'vitest';
import { formatAmount, formatSignedAmount } from './report-formatting';

describe('formatAmount', () => {
  it('does not group numbers under 1.000', () => {
    expect(formatAmount(0)).toBe('0');
    expect(formatAmount(999)).toBe('999');
  });

  // Regression test: `(4245).toLocaleString('es')` returns "4245" (no
  // separator) in this runtime, while `(10000).toLocaleString('es')`
  // returns "10.000" — grouping must not depend on that runtime quirk.
  it('groups a four-digit number with a thousands separator, regardless of the runtime locale', () => {
    expect(formatAmount(4245)).toBe('4.245');
    expect(formatAmount(1000)).toBe('1.000');
  });

  it('groups multi-level thousands for large numbers', () => {
    expect(formatAmount(262880)).toBe('262.880');
    expect(formatAmount(15105114)).toBe('15.105.114');
  });

  it('prefixes a "-" for negative amounts without adding a sign for positive ones', () => {
    expect(formatAmount(-4245)).toBe('-4.245');
    expect(formatAmount(258635)).toBe('258.635');
  });
});

describe('formatSignedAmount', () => {
  it('prefixes "+" for zero and positive amounts, grouping four-digit deltas correctly', () => {
    expect(formatSignedAmount(0)).toBe('+0');
    expect(formatSignedAmount(4245)).toBe('+4.245');
    expect(formatSignedAmount(1290420)).toBe('+1.290.420');
  });

  it('prefixes "-" for negative amounts, grouping four-digit deltas correctly', () => {
    expect(formatSignedAmount(-4245)).toBe('-4.245');
  });
});
