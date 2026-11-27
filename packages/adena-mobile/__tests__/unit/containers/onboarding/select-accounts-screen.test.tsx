import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import { SelectAccountsScreen } from '../../../../src/containers/onboarding/select-accounts-screen';
import { HdAccountPreview } from '../../../../src/services/hd-account-preview';
import { useOnboardingStore } from '../../../../src/stores/onboarding.store';
import { formatAddress } from '../../../../src/utils/address';
import { renderScreen, resetStores, TestEnv } from '../../../helpers/render-screen';
import { createTestContainer, TEST_MNEMONIC } from '../../../helpers/test-container';

jest.setTimeout(30_000);

const addressesOf = async (env: TestEnv, count: number): Promise<string[]> => {
  const preview = new HdAccountPreview(TEST_MNEMONIC, env.container.chainRegistry, env.container.networkService.getCurrentNetwork());
  const candidates = await preview.derive(0, count);

  preview.destroy();
  return candidates.map(candidate => candidate.address);
};

const isChecked = (hdIndex: number): boolean | undefined => screen.getByTestId(`select-account-${hdIndex}`).props.accessibilityState?.checked;

describe('SelectAccountsScreen', () => {
  beforeEach(() => {
    resetStores();
    useOnboardingStore.setState({ mnemonic: TEST_MNEMONIC });
  });

  it('lists the first five HD accounts with index 0 and funded accounts selected', async () => {
    const env = createTestContainer();
    const addresses = await addressesOf(env, 5);

    env.gno.state.balances[addresses[2]] = '5000000ugnot';
    await renderScreen(SelectAccountsScreen, { env });

    expect(await screen.findByTestId('select-account-4')).toBeTruthy();
    expect(screen.queryByTestId('select-account-5')).toBeNull();
    expect(screen.getByText('Account 1')).toBeTruthy();
    expect(screen.getByText(formatAddress(addresses[0]))).toBeTruthy();
    expect(await screen.findByText('5 GNOT')).toBeTruthy();
    await waitFor(() => expect(isChecked(2)).toBe(true));
    expect(isChecked(0)).toBe(true);
    expect([1, 3, 4].map(isChecked)).toEqual([false, false, false]);
    expect(screen.getByText('2 accounts selected')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Import 2 accounts' })).toBeTruthy();
  });

  it('loads five more, toggles and stores the picked indexes in order', async () => {
    const env = createTestContainer();
    const addresses = await addressesOf(env, 10);

    env.gno.state.balances[addresses[7]] = '1ugnot';
    const { navigation } = await renderScreen(SelectAccountsScreen, { env });

    await screen.findByTestId('select-account-4');
    await fireEvent.press(screen.getByRole('button', { name: 'Load 5 more' }));
    expect(await screen.findByTestId('select-account-9')).toBeTruthy();
    expect(screen.getByText('Account 10')).toBeTruthy();
    await waitFor(() => expect(isChecked(7)).toBe(true));

    await fireEvent.press(screen.getByTestId('select-account-0'));
    await fireEvent.press(screen.getByTestId('select-account-5'));
    expect(isChecked(0)).toBe(false);
    expect(isChecked(5)).toBe(true);

    await fireEvent.press(screen.getByRole('button', { name: 'Import 2 accounts' }));
    expect(useOnboardingStore.getState().hdIndexes).toEqual([5, 7]);
    expect(navigation.navigate).toHaveBeenCalledWith('ProtectWallet');
  });

  it('holds Import until every listed balance has loaded', async () => {
    const env = createTestContainer();
    const addresses = await addressesOf(env, 5);
    let release: () => void = () => undefined;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const original = HdAccountPreview.prototype.getNativeBalance;

    jest.spyOn(HdAccountPreview.prototype, 'getNativeBalance').mockImplementation(async function (this: HdAccountPreview, address: string) {
      if (address === addresses[3]) {
        await gate;
      }

      return original.call(this, address);
    });
    env.gno.state.balances[addresses[3]] = '2000000ugnot';
    const { navigation } = await renderScreen(SelectAccountsScreen, { env });

    await screen.findByTestId('select-account-4');
    expect(screen.getByText('Checking balances…')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('select-accounts-submit'));
    expect(navigation.navigate).not.toHaveBeenCalled();

    release();
    await fireEvent.press(await screen.findByRole('button', { name: 'Import 2 accounts' }));
    expect(useOnboardingStore.getState().hdIndexes).toEqual([0, 3]);
    jest.restoreAllMocks();
  });

  it('ignores a failed first page once the screen is gone', async () => {
    let fail: (error: Error) => void = () => undefined;

    jest.spyOn(HdAccountPreview.prototype, 'derive').mockReturnValue(new Promise((_resolve, reject) => {
      fail = reject;
    }));
    const { navigation, unmount } = await renderScreen(SelectAccountsScreen);

    await unmount();
    fail(new Error('derive failed'));
    await new Promise(resolve => setTimeout(resolve, 0));

    expect(navigation.goBack).not.toHaveBeenCalled();
    jest.restoreAllMocks();
  });

  it('blocks importing with nothing selected', async () => {
    const { navigation } = await renderScreen(SelectAccountsScreen);

    await screen.findByTestId('select-account-0');
    await fireEvent.press(screen.getByTestId('select-account-0'));
    await fireEvent.press(screen.getByRole('button', { name: 'Select an account' }));

    expect(navigation.navigate).not.toHaveBeenCalled();
    expect(useOnboardingStore.getState().hdIndexes).toBeNull();
  });

  it('shows a dash when a balance cannot be read', async () => {
    const env = createTestContainer();

    jest.spyOn(env.container.chainRegistry.forNetwork(env.container.networkService.getCurrentNetwork()), 'getNativeBalance').mockRejectedValue(new Error('offline'));
    await renderScreen(SelectAccountsScreen, { env });

    expect(await screen.findAllByText('—')).toHaveLength(5);
  });

  it('goes back without a phrase', async () => {
    useOnboardingStore.setState({ mnemonic: null });
    const { navigation } = await renderScreen(SelectAccountsScreen);

    expect(navigation.goBack).toHaveBeenCalled();
  });
});
