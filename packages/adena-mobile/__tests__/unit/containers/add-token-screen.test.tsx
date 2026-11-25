import { QueryClient } from '@tanstack/react-query';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import { AddTokenScreen } from '../../../src/containers/main/add-token-screen';
import { renderScreen, resetStores, setupWallet, toastMessage } from '../../helpers/render-screen';
import { API_URL, createTestContainer, RESOURCE_BASE } from '../../helpers/test-container';

const FOO = 'gno.land/r/demo/foo.FOO';
const BAR = 'gno.land/r/demo/bar.BAR';
const BAZ = 'gno.land/r/demo/baz.BAZ';
const HIDDEN = 'gno.land/r/demo/hidden.HID';
const NAMES: Record<string, [string, string]> = { [FOO]: ['Foo Token', 'FOO'], [BAR]: ['Bar Token', 'BAR'], [BAZ]: ['Baz Token', 'BAZ'], [HIDDEN]: ['Hidden', 'HID'] };

// Registry qeval stub: 100 keys in total, page one holds FOO/BAR, page two BAZ.
const registryEvaluate = (_pkg: string, expression: string): string => {
  if (expression.includes('IterateByOffset')) {
    return expression.includes('IterateByOffset(0,') ? `(100 int)\n("${FOO},${BAR}," string)` : `(100 int)\n("${BAZ}," string)`;
  }

  return [...expression.matchAll(/Get\("([^"]+)"\)/g)]
    .map(([, key]) => (NAMES[key] ? `("${NAMES[key][0]}" string)\n("${NAMES[key][1]}" string)\n(6 int)` : '("" string)\n("" string)\n(0 int)'))
    .join('\n');
};

// Mutation gc timers would otherwise keep Jest alive after the run.
const client = (): QueryClient => new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity }, mutations: { retry: false, gcTime: Infinity } } });

const setup = async () => {
  const wallet = await setupWallet();

  wallet.env.http
    .on(`${RESOURCE_BASE}/gno-native/gnoland-1.json`, [{ denom: 'ugnot', name: 'Gno.land', symbol: 'GNOT', decimals: 6 }])
    .on(`${RESOURCE_BASE}/grc20/gnoland-1.json`, [])
    .on(`${API_URL}/v1/accounts/${wallet.address}`, { data: { assets: [] } });
  wallet.env.gno.state.evaluate = registryEvaluate;
  return wallet;
};

describe('AddTokenScreen', () => {
  beforeEach(resetStores);

  it('lists the registry, searches, loads more and adds a token', async () => {
    const { env, account, network } = await setup();
    const { navigation } = await renderScreen(AddTokenScreen, { env, client: client() });

    expect(await screen.findByText('Foo Token (FOO)')).toBeTruthy();
    expect(screen.getByText('Bar Token (BAR)')).toBeTruthy();

    await fireEvent.press(screen.getByRole('button', { name: 'Load more' }));
    expect(await screen.findByText('Baz Token (BAZ)')).toBeTruthy();

    await fireEvent.changeText(screen.getByLabelText('Name, symbol or gno.land/r/….SYMBOL'), ' bar ');
    expect(screen.queryByText('Foo Token (FOO)')).toBeNull();
    expect(screen.getByText('Bar Token (BAR)')).toBeTruthy();

    await fireEvent.press(screen.getByRole('button', { name: 'Add' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Added' })).toBeTruthy());
    expect(toastMessage()).toBe('BAR added');
    expect((await env.container.tokenService.getTokenList(account, network)).some(token => token.id === BAR && token.visible)).toBe(true);

    await fireEvent.press(screen.getByRole('button', { name: 'Back' }));
    expect(navigation.goBack).toHaveBeenCalled();
  });

  it('resolves a full token key beyond the loaded registry pages', async () => {
    const { env } = await setup();

    await renderScreen(AddTokenScreen, { env, client: client() });
    await screen.findByText('Foo Token (FOO)');

    await fireEvent.changeText(screen.getByLabelText('Name, symbol or gno.land/r/….SYMBOL'), HIDDEN);
    expect(await screen.findByText('Hidden (HID)')).toBeTruthy();
    expect(screen.queryByText('Foo Token (FOO)')).toBeNull();

    await fireEvent.changeText(screen.getByLabelText('Name, symbol or gno.land/r/….SYMBOL'), FOO);
    await waitFor(() => expect(screen.getAllByText('Foo Token (FOO)')).toHaveLength(1));

    await fireEvent.changeText(screen.getByLabelText('Name, symbol or gno.land/r/….SYMBOL'), 'gno.land/r/demo/missing.MISS');
    expect(await screen.findByText('No tokens found')).toBeTruthy();
  });

  it('shows add and registry errors', async () => {
    const { env } = await setup();

    jest.spyOn(env.container.tokenService, 'addCustomToken').mockRejectedValueOnce(new Error('Token not found in the registry'));
    await renderScreen(AddTokenScreen, { env, client: client() });
    await fireEvent.press((await screen.findAllByRole('button', { name: 'Add' }))[0]);
    expect(await screen.findByText('Token not found in the registry')).toBeTruthy();

    await fireEvent.changeText(screen.getByLabelText('Name, symbol or gno.land/r/….SYMBOL'), 'f');
    expect(screen.queryByText('Token not found in the registry')).toBeNull();

    const broken = await setup();

    broken.env.gno.state.evaluate = (): string => {
      throw new Error('registry unavailable');
    };

    await renderScreen(AddTokenScreen, { env: broken.env, client: client() });
    expect(await screen.findByText('registry unavailable')).toBeTruthy();
  });

  it('does not add without an account', async () => {
    const env = createTestContainer();
    const add = jest.spyOn(env.container.tokenService, 'addCustomToken');

    env.gno.state.evaluate = registryEvaluate;
    env.http.on(`${RESOURCE_BASE}/gno-native/gnoland-1.json`, []).on(`${RESOURCE_BASE}/grc20/gnoland-1.json`, []);
    await renderScreen(AddTokenScreen, { env, client: client() });
    await fireEvent.press((await screen.findAllByRole('button', { name: 'Add' }))[0]);

    expect(add).not.toHaveBeenCalled();
  });
});
