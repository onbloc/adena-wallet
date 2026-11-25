import { QueryClient } from '@tanstack/react-query';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AddTokenScreen } from '../../../../src/containers/main/add-token-screen';
import { buildAssetViews, filterPortfolioAssets } from '../../../../src/presenters/asset.presenter';
import { DEFAULT_PREFERENCES } from '../../../../src/repositories/preference.repository';
import { StorageTokenListRepository } from '../../../../src/repositories/token-list.repository';
import { AccountService } from '../../../../src/services/account.service';
import { TokenService } from '../../../../src/services/token.service';
import { MemoryKeyValueStore } from '../../../../src/storage/memory-key-value-store';
import { createWrapper } from '../../../helpers/query-wrapper';
import { createFakeRegistry, GNO_NETWORK, makeAccount, makeToken } from '../../../helpers/service-fakes';

const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } };
const ACCOUNT = makeAccount();
const HELD = makeToken({ name: 'Held Token', symbol: 'HELD' });

// No mutation GC timer, which would otherwise keep Jest alive after the add.
const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity }, mutations: { gcTime: Infinity } } });

const setup = async () => {
  const { registry, modules } = createFakeRegistry();
  const accountService = { getCurrentAccount: () => ACCOUNT, getAccounts: () => [ACCOUNT], getAddress: () => 'g1addr' };
  const tokenService = new TokenService(registry, accountService as unknown as AccountService, new StorageTokenListRepository(new MemoryKeyValueStore()));

  // Held but outside the curated list, so the first refresh stores it as discovered and unlisted.
  modules.gno.assets.discoverHeldTokens.mockResolvedValue([HELD]);
  modules.gno.assets.findToken.mockResolvedValue(HELD);
  modules.gno.assets.searchRegistry.mockResolvedValue({ tokens: [HELD], total: 1 });
  await tokenService.getTokenList(ACCOUNT, GNO_NETWORK);

  const { Wrapper } = createWrapper({
    accountService,
    networkService: { getCurrentNetwork: () => GNO_NETWORK, getNetworks: () => [GNO_NETWORK] },
    chainRegistry: registry,
    tokenService,
  }, client);
  const Screen = AddTokenScreen as unknown as React.ComponentType<{ navigation: unknown; route: unknown }>;

  await render(
    <SafeAreaProvider initialMetrics={metrics}>
      <Wrapper><Screen navigation={{ goBack: jest.fn() }} route={{ key: 'AddToken', name: 'AddToken' }} /></Wrapper>
    </SafeAreaProvider>,
  );

  return { tokenService };
};

const homeIds = async (tokenService: TokenService): Promise<string[]> => {
  const tokens = (await tokenService.getTokenList(ACCOUNT, GNO_NETWORK)).filter(token => token.visible);
  const views = buildAssetViews(tokens, undefined, undefined, false);

  return filterPortfolioAssets(views, tokens, DEFAULT_PREFERENCES).map(view => view.token.id);
};

describe('AddTokenScreen', () => {
  afterEach(async () => {
    await act(() => new Promise<void>((done) => {
      setTimeout(done, 0);
    }));
    client.clear();
  });

  it('offers Add for a held token Home hides as unknown, and adding it shows it on Home', async () => {
    const { tokenService } = await setup();

    expect(await homeIds(tokenService)).not.toContain(HELD.id);
    await waitFor(() => expect(screen.getByRole('button', { name: 'Add' })).toBeTruthy());

    await fireEvent.press(screen.getByRole('button', { name: 'Add' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Added' })).toBeTruthy());
    expect(await homeIds(tokenService)).toContain(HELD.id);
  });
});
