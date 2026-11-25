import { darkPalette, palette, spacing, theme, themeColors, typography } from '../../../src/theme';

describe('theme', () => {
  it('bundles every token group', () => {
    expect(Object.keys(theme).sort()).toEqual(['colors', 'darkPalette', 'elevation', 'fontFamily', 'motion', 'palette', 'radius', 'sizes', 'spacing', 'tabularNumbers', 'typography']);
    expect(theme.colors).toBe(themeColors);
    expect(theme.palette).toBe(palette);
    expect(theme.darkPalette).toBe(darkPalette);
    expect(theme.spacing).toBe(spacing);
    expect(theme.typography).toBe(typography);
  });
});
