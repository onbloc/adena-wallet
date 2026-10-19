import {exploreSites} from '../../src/core/explore-sites';

const site = (name: string, order: number, display = true) => ({
  symbol: name,
  name,
  description: '',
  logo: `/resources/apps/images/${name}.svg`,
  link: `https://${name}.example`,
  display,
  order,
});

describe('exploreSites', () => {
  it('lists the bundled dApps in order, each with its logo', () => {
    const sites = exploreSites();
    expect(sites.length).toBeGreaterThan(0);
    expect(sites.map(item => item.order)).toEqual(
      [...sites.map(item => item.order)].sort((a, b) => a - b),
    );
    for (const item of sites) {
      expect(item.bundledLogo).not.toBeNull();
      expect(item.link.startsWith('https://')).toBe(true);
    }
  });

  it('drops hidden entries and keeps an unknown logo empty', () => {
    const sites = exploreSites([
      site('b', 2),
      site('hidden', 1, false),
      site('a', 1),
    ]);
    expect(sites.map(item => item.name)).toEqual(['a', 'b']);
    expect(sites[0].bundledLogo).toBeNull();
  });
});
