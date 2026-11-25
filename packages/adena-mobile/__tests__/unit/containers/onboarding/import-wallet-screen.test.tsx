import { act, fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';
import { AppState, AppStateStatus } from 'react-native';

import { ImportWalletScreen } from '../../../../src/containers/onboarding/import-wallet-screen/import-wallet-screen';
import { useOnboardingStore } from '../../../../src/stores/onboarding.store';
import { TEST_MNEMONIC } from '../../../helpers/test-container';
import { wrapPage } from '../../components/pages/render-page';

type ImportWalletProps = Parameters<typeof ImportWalletScreen>[0];

describe('ImportWalletScreen', () => {
  let listener: (state: AppStateStatus) => void;
  const navigation = { navigate: jest.fn(), goBack: jest.fn() };
  const props = { navigation, route: { key: 'ImportWallet', name: 'ImportWallet' } } as unknown as ImportWalletProps;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(AppState, 'addEventListener').mockImplementation((_type, handler) => {
      listener = handler as (state: AppStateStatus) => void;
      return { remove: jest.fn() } as never;
    });
    useOnboardingStore.setState({ mnemonic: null });
  });

  afterEach(() => jest.restoreAllMocks());

  it.each<AppStateStatus>(['inactive', 'background'])('hides the typed phrase when the app turns %s and keeps it for the import', async (state) => {
    await render(wrapPage(<ImportWalletScreen {...props} />));
    await fireEvent.changeText(screen.getByLabelText('Recovery phrase'), TEST_MNEMONIC);

    await act(async () => listener(state));
    await act(async () => listener('active'));
    expect(screen.queryByLabelText('Recovery phrase')).toBeNull();
    expect(screen.queryByDisplayValue(TEST_MNEMONIC)).toBeNull();
    expect(screen.getByTestId('import-secret-masked')).toBeTruthy();

    await fireEvent.press(screen.getByRole('button', { name: 'Show' }));
    expect(screen.getByDisplayValue(TEST_MNEMONIC)).toBeTruthy();

    await fireEvent.press(screen.getByTestId('import-submit'));
    expect(navigation.navigate).toHaveBeenCalledWith('CreatePassword');
    expect(useOnboardingStore.getState().mnemonic).toBe(TEST_MNEMONIC);
  });
});
