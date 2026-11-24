import { DEFAULT_EXPLORER_URL, HTTP_TIMEOUT_MS, REMOTE_RESOURCES } from '../../../src/config/endpoints';

describe('endpoints', () => {
  it('uses https endpoints without trailing slashes', () => {
    for (const url of [DEFAULT_EXPLORER_URL, REMOTE_RESOURCES.gnoTokenResourceBase]) {
      expect(url).toMatch(/^https:\/\/.+[^/]$/);
    }
  });

  it('uses a positive http timeout', () => {
    expect(HTTP_TIMEOUT_MS).toBe(15_000);
  });
});
