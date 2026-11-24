import { act, fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';

import { ResetWalletPageProps } from '../../../src/components/pages';
import { ResetWalletScreen } from '../../../src/containers/reset-wallet-screen';
import { SessionStatus, useSessionStore } from '../../../src/stores/session.store';
import { createWrapper } from '../../helpers/query-wrapper';
import { wrapPage } from '../components/pages/render-page';

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ goBack: jest.fn() }),
}));

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
  const resetAll = jest.fn();
  const getStatus = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    useSessionStore.setState({ status: SessionStatus.LOCKED });
    getStatus.mockResolvedValue(SessionStatus.LOCKED);
  });

  const renderScreen = async (): Promise<void> => {
    const { Wrapper } = createWrapper({ appResetService: { resetAll }, walletService: { getStatus } });

    await render(wrapPage(<Wrapper><ResetWalletScreen /></Wrapper>));
    await fireEvent.press(screen.getByRole('checkbox'));
  };

  it('starts one reset for rapid repeated taps', async () => {
    let finish: () => void = () => undefined;

    resetAll.mockImplementation(() => new Promise<void>((resolve) => {
      finish = resolve;
    }));
    await renderScreen();
    // Both taps reach the same render's handler, before the button shows the loading state.
    await act(async () => {
      mockPage.props?.onReset();
      mockPage.props?.onReset();
    });
    expect(resetAll).toHaveBeenCalledTimes(1);

    await act(async () => finish());
  });

  it('shows the error and allows a retry after a failure', async () => {
    resetAll.mockRejectedValueOnce(new Error('Storage failed')).mockResolvedValueOnce(undefined);
    await renderScreen();

    await fireEvent.press(screen.getByTestId('reset-confirm'));
    expect(await screen.findByText('Storage failed')).toBeTruthy();

    await fireEvent.press(screen.getByTestId('reset-confirm'));
    expect(resetAll).toHaveBeenCalledTimes(2);
  });
});
