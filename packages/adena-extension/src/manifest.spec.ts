import fs from 'fs';
import path from 'path';

import buildConfig from '../webpack.config';
import packageInfo from '../package.json';

/**
 * The Firefox manifest is the Chrome one plus a small delta, so a key added to
 * `public/manifest.json` can never silently miss the Firefox build — as
 * `img-src data:` did, blocking NFT images on Firefox only.
 */
const readEmittedManifest = (browser?: 'firefox'): Record<string, any> => {
  const config = buildConfig(browser ? { browser } : {});
  const copyPlugin = config.plugins.find(
    (plugin: any) => plugin?.patterns?.[0]?.to === 'manifest.json',
  );
  const pattern = (copyPlugin as any).patterns[0];
  const source = fs.readFileSync(path.join(__dirname, '..', pattern.from), 'utf8');

  return JSON.parse(pattern.transform(Buffer.from(source)).toString());
};

describe('emitted manifests', () => {
  const chrome = readEmittedManifest();
  const firefox = readEmittedManifest('firefox');

  it('carries the extension package version in both targets', () => {
    expect(chrome.version).toBe(packageInfo.version);
    expect(firefox.version).toBe(packageInfo.version);
  });

  it('gives Firefox a background event page and Chrome a service worker', () => {
    expect(chrome.background).toEqual({ service_worker: 'background.js' });
    expect(firefox.background).toEqual({ scripts: ['background.js'] });
    // Firefox does not support MV3 extension service workers at all.
    expect(firefox.background.service_worker).toBeUndefined();
  });

  it('declares the Gecko add-on id only for Firefox', () => {
    expect(firefox.browser_specific_settings?.gecko?.id).toBeTruthy();
    expect(chrome.browser_specific_settings).toBeUndefined();
  });

  it('shares every non-Firefox-specific key, so the two cannot drift', () => {
    const firefoxOnly = new Set(['background', 'browser_specific_settings']);

    for (const key of Object.keys(chrome)) {
      if (firefoxOnly.has(key)) {
        continue;
      }
      expect(firefox[key]).toEqual(chrome[key]);
    }
  });

  it('allows data: images in both targets, so NFT data-URI artwork renders', () => {
    for (const manifest of [chrome, firefox]) {
      const imgSrc = manifest.content_security_policy.extension_pages
        .split(';')
        .map((directive: string) => directive.trim())
        .find((directive: string) => directive.startsWith('img-src'));

      expect(imgSrc).toContain('data:');
    }
  });
});
