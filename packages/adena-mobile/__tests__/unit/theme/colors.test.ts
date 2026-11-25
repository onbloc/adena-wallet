import { avatarColors, darkColors, darkPalette, lightColors, palette, StatusTone, ThemeColors, themeColors } from '../../../src/theme/colors';

const leaves = (value: object): string[] =>
  Object.values(value).flatMap(item => (typeof item === 'object' ? leaves(item) : [item]));

const paths = (value: object, prefix = ''): string[] =>
  Object.entries(value).flatMap(([key, item]) => (typeof item === 'object' ? paths(item, `${prefix}${key}.`) : [`${prefix}${key}`]));

// WCAG 2.x relative luminance and contrast ratio.
const luminance = (hex: string): number => {
  const [r, g, b] = [1, 3, 5].map((index) => {
    const channel = parseInt(hex.slice(index, index + 2), 16) / 255;

    return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });

  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

const contrast = (a: string, b: string): number => {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);

  return (light + 0.05) / (dark + 0.05);
};

describe('palettes', () => {
  it('hold hex primitives', () => {
    expect(Object.keys(palette)).toHaveLength(12);
    [...Object.values(palette), ...Object.values(darkPalette)].forEach(hex => expect(hex).toMatch(/^#[0-9A-F]{6}$/));
  });
});

describe.each([['light', lightColors, palette], ['dark', darkColors, darkPalette]] as const)('%s colors', (scheme, colors, primitives) => {
  it('map semantic roles to palette values or fixed overlays', () => {
    const allowed = new Set<string>([...Object.values(primitives), colors.overlay.scrim, colors.overlay.shadow]);

    leaves(colors).forEach(value => expect(allowed.has(value)).toBe(true));
    expect(themeColors[scheme]).toBe(colors);
  });

  it('share the same roles', () => {
    expect(paths(colors)).toEqual(paths(lightColors));
  });

  it.each<[string, (c: ThemeColors) => [string, string], number]>([
    ['primary text on the canvas', c => [c.text.primary, c.background.canvas], 4.5],
    ['primary text on surfaces', c => [c.text.primary, c.background.surface], 4.5],
    ['primary text on subtle rows', c => [c.text.primary, c.background.subtle], 4.5],
    ['secondary text on the canvas', c => [c.text.secondary, c.background.canvas], 4.5],
    ['secondary text on subtle rows', c => [c.text.secondary, c.background.subtle], 4.5],
    ['primary action label', c => [c.text.inverse, c.action.primary], 4.5],
    ['secondary action label', c => [c.text.primary, c.action.secondary], 4.5],
    ['success on the canvas', c => [c.status.success, c.background.canvas], 4.5],
    ['error on the canvas', c => [c.status.error, c.background.canvas], 4.5],
    ['warning on the canvas', c => [c.status.warning, c.background.canvas], 4.5],
    ['error on surfaces', c => [c.status.error, c.background.surface], 4.5],
    ['destructive action label', c => [c.text.inverse, c.status.error], 4.5],
    ['input border on surfaces', c => [c.border.input, c.background.surface], 3],
  ])('keeps %s readable', (_, pick, minimum) => {
    const [foreground, background] = pick(colors);

    expect(contrast(foreground, background)).toBeGreaterThanOrEqual(minimum);
  });
});

describe('avatarColors', () => {
  it('keep white initials above 4.5:1', () => {
    Object.values(avatarColors).forEach(color => expect(contrast('#FFFFFF', color)).toBeGreaterThanOrEqual(4.5));
  });
});

describe('StatusTone', () => {
  it('exposes the tones', () => {
    expect(Object.values(StatusTone)).toEqual(['neutral', 'success', 'warning', 'error', 'info']);
  });
});
