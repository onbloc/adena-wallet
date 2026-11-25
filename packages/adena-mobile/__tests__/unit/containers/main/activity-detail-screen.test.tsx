import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import React from 'react';
import { Linking } from 'react-native';

import { ActivityDetailScreen } from '../../../../src/containers/main/activity-detail-screen';
import { Activity } from '../../../../src/domain/activity';
import { ChainFamily, Network } from '../../../../src/domain/network';
import { useWalletAssets } from '../../../../src/hooks/use-wallet-assets';
import { useToastStore } from '../../../../src/stores/toast.store';
import { createWrapper, NETWORK } from '../../../helpers/query-wrapper';
import { wrapPage } from '../../components/pages/render-page';

jest.mock('../../../../src/hooks/use-wallet-assets', () => ({ useWalletAssets: jest.fn() }));

type ActivityDetailProps = Parameters<typeof ActivityDetailScreen>[0];

const ACTIVITY: Activity = { hash: 'ABC', type: 'TRANSFER', title: 'Send', status: 'SUCCESS', direction: 'out', amount: { value: '1000000', denom: 'ugnot' } };

const setup = async (network: Network = NETWORK) => {
  jest.mocked(useWalletAssets).mockReturnValue({ allTokens: [], network } as unknown as ReturnType<typeof useWalletAssets>);
  const { Wrapper } = createWrapper({});
  const props = { navigation: { goBack: jest.fn() }, route: { key: 'ActivityDetail', name: 'ActivityDetail', params: { activity: ACTIVITY } } } as unknown as ActivityDetailProps;

  await render(wrapPage(<Wrapper><ActivityDetailScreen {...props} /></Wrapper>));
};

describe('ActivityDetailScreen', () => {
  beforeEach(() => useToastStore.setState({ toast: null }));
  afterEach(() => jest.restoreAllMocks());

  it('shows a toast when the explorer cannot be opened', async () => {
    jest.spyOn(Linking, 'openURL').mockRejectedValueOnce(new Error('no handler'));
    await setup();

    await fireEvent.press(screen.getByRole('button', { name: 'View on Gnoscan' }));

    await waitFor(() => expect(useToastStore.getState().toast).toMatchObject({ tone: 'error', message: 'Couldn’t open Gnoscan' }));
  });

  it('names the Cosmos network explorer', async () => {
    await setup({ ...NETWORK, family: ChainFamily.COSMOS, addressPrefix: 'atone', linkUrl: 'https://www.mintscan.io/atomone' });

    expect(screen.getByRole('button', { name: 'View on Mintscan' })).toBeTruthy();
  });
});
