import { act, fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';

import { AddNetworkScreen } from '../../../../src/containers/main/add-network-screen';
import { AppError, AppErrorCode } from '../../../../src/core/errors';
import { createWrapper, NETWORK } from '../../../helpers/query-wrapper';
import { wrapPage } from '../../components/pages/render-page';

type AddNetworkProps = Parameters<typeof AddNetworkScreen>[0];

describe('AddNetworkScreen', () => {
  const setup = async () => {
    const networkService = {
      getNetworks: jest.fn(() => [NETWORK]),
      addCustomNetwork: jest.fn(),
      selectNetwork: jest.fn(),
    };
    const navigation = { goBack: jest.fn(), pop: jest.fn() };
    const { Wrapper } = createWrapper({ networkService });
    const props = { navigation, route: { key: 'AddNetwork', name: 'AddNetwork' } } as unknown as AddNetworkProps;

    await render(wrapPage(<Wrapper><AddNetworkScreen {...props} /></Wrapper>));
    await fireEvent.changeText(screen.getByLabelText('Network name'), 'Local');
    await fireEvent.changeText(screen.getByLabelText('RPC URL'), 'http://localhost:26657');

    return { networkService, navigation };
  };

  it('saves and pops once when the button is tapped twice before a re-render', async () => {
    const { networkService, navigation } = await setup();
    let finish!: (value: unknown) => void;

    networkService.addCustomNetwork.mockImplementationOnce(() => new Promise((done) => {
      finish = done;
    }));
    const button = screen.getByRole('button', { name: 'Add network' });

    await act(async () => {
      fireEvent.press(button);
      fireEvent.press(button);
    });
    await act(async () => finish({ ...NETWORK, id: 'custom:1' }));

    expect(networkService.addCustomNetwork).toHaveBeenCalledTimes(1);
    expect(navigation.pop).toHaveBeenCalledTimes(1);
  });

  it('allows another attempt after a failure', async () => {
    const { networkService } = await setup();

    networkService.addCustomNetwork.mockRejectedValueOnce(new AppError(AppErrorCode.INVALID_REQUEST, 'Use an https:// URL.'));
    await fireEvent.press(screen.getByRole('button', { name: 'Add network' }));
    expect(await screen.findByText('Use an https:// URL.')).toBeTruthy();

    networkService.addCustomNetwork.mockResolvedValueOnce({ ...NETWORK, id: 'custom:1' });
    await fireEvent.press(screen.getByRole('button', { name: 'Add network' }));
    expect(networkService.addCustomNetwork).toHaveBeenCalledTimes(2);
  });
});
