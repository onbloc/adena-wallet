import { fontFamily, tabularNumbers, typography } from '../../../src/theme/typography';

describe('typography', () => {
  it('uses bundled Inter weights for every role', () => {
    const families = new Set(Object.values(fontFamily));

    Object.values(typography).forEach((style) => {
      expect(families.has(style.fontFamily as typeof fontFamily.regular)).toBe(true);
      expect(style.lineHeight).toBeGreaterThanOrEqual(style.fontSize as number);
    });
  });

  it('defines tabular numbers', () => {
    expect(tabularNumbers).toEqual({ fontVariant: ['tabular-nums'] });
  });
});
