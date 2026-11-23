import { colors, palette, spacing, theme, typography } from '../../../src/theme';

describe('theme', () => {
  it('bundles every token group', () => {
    expect(Object.keys(theme).sort()).toEqual(['colors', 'elevation', 'fontFamily', 'motion', 'palette', 'radius', 'sizes', 'spacing', 'tabularNumbers', 'typography']);
    expect(theme.colors).toBe(colors);
    expect(theme.palette).toBe(palette);
    expect(theme.spacing).toBe(spacing);
    expect(theme.typography).toBe(typography);
  });
});
