import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';

import { ResetWalletPageProps } from '../../../src/components/pages';
import { ResetWalletScreen } from '../../../src/containers/reset-wallet-screen';
import { useDappRequestStore } from '../../../src/stores/dapp-request.store';
import { SessionStatus, useSessionStore } from '../../../src/stores/session.store';
import { useToastStore } from '../../../src/stores/toast.store';
import { renderScreen, resetStores, setupWallet } from '../../helpers/render-screen';

jest.setTimeout(30_000);

const mockPage: { props?: ResetWalletPageProps } = {};

jest.mock('../../../src/components/pages', () => {
  const actual = jest.requireActual('../../../src/components/pages');

  return {
    ...actual,
    ResetWalletPage: (props: ResetWalletPageProps) => {
      mockPage.props = props;
      return actual.ResetWalletPage(props);
    },
  };
});

describe('ResetWalletScreen', () => {
  beforeEach(resetStores);

  it('requires the acknowledgement, then wipes the wallet and returns to onboarding', async () => {
    const { env } = await setupWallet();

    useDappRequestStore.setState({ queue: ['adena://x'] });
    useToastStore.getState().show('hello');
    await renderScreen(ResetWalletScreen, { env });

    await fireEvent.press(screen.getByRole('button', { name: 'Reset wallet' }));
    expect(useSessionStore.getState().status).toBe(SessionStatus.BOOTING);

    await fireEvent.press(screen.getByRole('checkbox', { name: 'I have backed up my recovery phrases' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Reset wallet' }));

    await waitFor(() => expect(useSessionStore.getState().status).toBe(SessionStatus.EMPTY));
    await expect(env.container.walletService.getStatus()).resolves.toBe(SessionStatus.EMPTY);
    expect(useDappRequestStore.getState().queue).toEqual([]);
    expect(useToastStore.getState().toast).toBeNull();
  });

  it('starts one reset for rapid repeated taps', async () => {
    const { env } = await setupWallet();
    let finish: () => void = () => undefined;
    const resetAll = jest.spyOn(env.container.appResetService, 'resetAll').mockImplementation(() => new Promise<void>((resolve) => {
      finish = resolve;
    }));

    await renderScreen(ResetWalletScreen, { env });
    await fireEvent.press(screen.getByRole('checkbox', { name: 'I have backed up my recovery phrases' }));
    // Both taps reach the same render's handler, before the button shows the loading state.
    await act(async () => {
      mockPage.props?.onReset();
      mockPage.props?.onReset();
    });
    expect(resetAll).toHaveBeenCalledTimes(1);

    await act(async () => finish());
  });

  it('shows the failure and lets the user retry', async () => {
    const { env } = await setupWallet();

    const resetAll = jest.spyOn(env.container.appResetService, 'resetAll').mockRejectedValueOnce(new Error('disk busy'));
    const { navigation } = await renderScreen(ResetWalletScreen, { env });

    await fireEvent.press(screen.getByRole('checkbox', { name: 'I have backed up my recovery phrases' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Reset wallet' }));

    expect(await screen.findByText('disk busy')).toBeTruthy();
    expect(screen.getByText('Reset failed')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Reset wallet' })).toBeTruthy();

    await fireEvent.press(screen.getByRole('button', { name: 'Reset wallet' }));
    expect(resetAll).toHaveBeenCalledTimes(2);

    await fireEvent.press(screen.getByRole('button', { name: 'Back' }));
    expect(navigation.goBack).toHaveBeenCalled();
  });
});
