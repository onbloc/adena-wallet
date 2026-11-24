import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import React from 'react';
import { Share } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ReceiveScreen } from '../../../../src/containers/main/receive-screen';
import { useToastStore } from '../../../../src/stores/toast.store';
import { ACCOUNT, createWrapper, NETWORK } from '../../../helpers/query-wrapper';

const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } };
const ADDRESS = 'g1jg8mtutu9khhfwc4nxmuhcpftf0pajdhfvsqf5';

const setup = async () => {
  const { Wrapper } = createWrapper({
    accountService: { getCurrentAccount: () => ACCOUNT, getAccounts: () => [ACCOUNT], getAddress: () => ADDRESS },
    networkService: { getCurrentNetwork: () => NETWORK, getNetworks: () => [NETWORK] },
  });
  const navigation = { goBack: jest.fn(), replace: jest.fn() };
  const Screen = ReceiveScreen as unknown as React.ComponentType<{ navigation: unknown; route: unknown }>;

  await render(
    <SafeAreaProvider initialMetrics={metrics}>
      <Wrapper><Screen navigation={navigation} route={{ key: 'Receive', name: 'Receive' }} /></Wrapper>
    </SafeAreaProvider>,
  );
};

describe('ReceiveScreen', () => {
  afterEach(() => jest.restoreAllMocks());

  it('names the chain with the network in the warning', async () => {
    await setup();

    expect(screen.getByText(`Only send ${NETWORK.chainName} ${NETWORK.networkName} assets to this address.`)).toBeTruthy();
  });

  it('reports a share sheet that fails to open', async () => {
    jest.spyOn(Share, 'share').mockRejectedValue(new Error('no share'));
    useToastStore.setState({ toast: null });

    await setup();
    await fireEvent.press(screen.getByRole('button', { name: 'Share' }));

    await waitFor(() => expect(useToastStore.getState().toast).toMatchObject({ message: 'Couldn’t open the share sheet', tone: 'error' }));
  });
});
