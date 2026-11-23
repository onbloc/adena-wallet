import { colors, palette, StatusTone } from '../../../src/theme/colors';

const leaves = (value: object): string[] =>
  Object.values(value).flatMap(item => (typeof item === 'object' ? leaves(item) : [item]));

describe('palette', () => {
  it('holds 12 hex primitives', () => {
    expect(Object.keys(palette)).toHaveLength(12);
    Object.values(palette).forEach(hex => expect(hex).toMatch(/^#[0-9A-F]{6}$/));
  });
});

describe('colors', () => {
  it('maps semantic roles to palette values or fixed overlays', () => {
    const allowed = new Set<string>([...Object.values(palette), colors.overlay.scrim, colors.overlay.shadow]);

    leaves(colors).forEach(value => expect(allowed.has(value)).toBe(true));
    expect(colors.text.primary).toBe(palette.neutral900);
    expect(colors.status.error).toBe(palette.red700);
  });
});

describe('StatusTone', () => {
  it('exposes the tones', () => {
    expect(Object.values(StatusTone)).toEqual(['neutral', 'success', 'warning', 'error', 'info']);
  });
});
