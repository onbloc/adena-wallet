import { elevation, motion, radius, sizes, spacing } from '../../../src/theme/layout';

describe('layout tokens', () => {
  it('keeps spacing on a 4px grid', () => {
    Object.values(spacing).forEach(value => expect(value % 4).toBe(0));
  });

  it('meets the minimum touch target', () => {
    expect(sizes.touchTarget).toBeGreaterThanOrEqual(44);
    expect(sizes.tab).toBeGreaterThanOrEqual(44);
    expect(sizes.screenInset).toBe(spacing.space24);
    expect(sizes.topBar).toBeGreaterThanOrEqual(sizes.touchTarget);
  });

  it('exposes radius, motion and elevation tokens', () => {
    expect(radius.circle).toBe(999);
    expect(motion).toEqual({ press: 140, transition: 220 });
    expect(elevation.overlay).toMatchObject({ shadowColor: '#000000', elevation: 6 });
  });
});
