import { EventMessage } from '@inject/message/event-message';
import { EstablishSite } from '@repositories/wallet';
import type { Mock } from 'vitest';

import { dispatchEventToEstablishedTabs } from './use-event';

type TabStub = { id?: number; url?: string };

const mockChromeTabs = (tabs: TabStub[]): { sendMessage: Mock } => {
  const sendMessage = vi.fn().mockResolvedValue(undefined);
  (globalThis as unknown as { chrome: unknown }).chrome = {
    tabs: { query: vi.fn().mockResolvedValue(tabs), sendMessage },
  };
  return { sendMessage };
};

const site = (hostname: string): EstablishSite => ({
  hostname,
  chainId: 'test11',
  account: 'account-1',
  name: hostname,
  favicon: null,
  establishedTime: '0',
});

describe('dispatchEventToEstablishedTabs', () => {
  const message = EventMessage.event('changedAccount', 'g1new');

  afterEach(() => {
    delete (globalThis as unknown as { chrome?: unknown }).chrome;
  });

  it('sends the event to every tab of a connected site, including background tabs', async () => {
    const { sendMessage } = mockChromeTabs([
      { id: 1, url: 'https://gnoswap.io/swap' },
      { id: 2, url: 'https://gnoswap.io/earn' },
      { id: 3, url: 'https://dev.gnoswap.io/' },
    ]);

    await dispatchEventToEstablishedTabs(message, async () => [
      site('https://gnoswap.io'),
      site('https://dev.gnoswap.io'),
    ]);

    expect(sendMessage.mock.calls.map(([tabId]) => tabId)).toEqual([1, 2, 3]);
    expect(sendMessage).toHaveBeenCalledWith(1, message);
  });

  it('skips tabs whose site is not connected to the current account', async () => {
    const { sendMessage } = mockChromeTabs([
      { id: 1, url: 'https://gnoswap.io/' },
      { id: 2, url: 'https://unconnected.example/' },
      { id: 3, url: 'http://gnoswap.io/' },
    ]);

    await dispatchEventToEstablishedTabs(message, async () => [site('https://gnoswap.io')]);

    expect(sendMessage).toHaveBeenCalledTimes(1);
    expect(sendMessage).toHaveBeenCalledWith(1, message);
  });

  it('skips tabs without an id or a parseable url', async () => {
    const { sendMessage } = mockChromeTabs([
      { url: 'https://gnoswap.io/' },
      { id: 2 },
      { id: 3, url: 'not a url' },
    ]);

    await dispatchEventToEstablishedTabs(message, async () => [site('https://gnoswap.io')]);

    expect(sendMessage).not.toHaveBeenCalled();
  });

  it('sends nothing when the current account has no connected sites', async () => {
    const { sendMessage } = mockChromeTabs([{ id: 1, url: 'https://gnoswap.io/' }]);

    await dispatchEventToEstablishedTabs(message, async () => []);

    expect(sendMessage).not.toHaveBeenCalled();
  });
});
