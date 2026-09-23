import React from 'react';

import { GlobalPopupStyle } from '@styles/global-style';
import theme from '@styles/theme';
import { UseQueryResult } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { RecoilRoot } from 'recoil';
import { ThemeProvider } from 'styled-components';
import NFTTransferSummary, { NFTTransferSummaryProps } from './nft-transfer-summary';

const makeProps = (overrides?: Partial<NFTTransferSummaryProps>): NFTTransferSummaryProps => ({
  grc721Token: {
    metadata: null,
    name: '',
    networkId: '',
    packagePath: '',
    symbol: '',
    tokenId: '',
    type: 'grc721',
    isMetadata: true,
    isTokenUri: true,
  },
  toAddress: '',
  networkFee: {
    amount: '0.0048',
    denom: 'GNOT',
  },
  memo: '',
  queryGRC721TokenUri: (): UseQueryResult<string | null> =>
    ({}) as unknown as UseQueryResult<string | null>,
  onClickBack: (): void => {
    return;
  },
  onClickCancel: (): void => {
    return;
  },
  onClickSend: (): void => {
    return;
  },
  onClickNetworkFeeSetting: (): void => {
    return;
  },
  isErrorNetworkFee: false,
  ...overrides,
});

const renderSummary = (props: NFTTransferSummaryProps): void => {
  render(
    <RecoilRoot>
      <GlobalPopupStyle />
      <ThemeProvider theme={theme}>
        <NFTTransferSummary {...props} />
      </ThemeProvider>
    </RecoilRoot>,
  );
};

const isSendDisabled = (): boolean =>
  !!(screen.getByText('Send').closest('button') as HTMLElement).classList.contains('disabled');

describe('NFTTransferSummary Component', () => {
  it('NFTTransferSummary render', () => {
    renderSummary(makeProps());
  });

  // A successful estimate used to be painted as an error because the
  // insufficient-fee message was always handed to NetworkFee.
  it('shows no fee error when the estimate succeeded', () => {
    renderSummary(makeProps());

    expect(screen.queryByText('Insufficient network fee')).toBeNull();
    expect(isSendDisabled()).toBe(false);
  });

  it('shows the insufficient-fee message only when the fee really is short', () => {
    renderSummary(makeProps({ isErrorNetworkFee: true }));

    expect(screen.getByText('Insufficient network fee')).toBeTruthy();
    expect(isSendDisabled()).toBe(true);
  });

  it('reports the simulate failure instead of an insufficient-fee error', () => {
    renderSummary(
      makeProps({
        isSimulateError: true,
        simulateErrorBannerMessage: 'unauthorized: caller is not token owner',
        networkFee: { amount: '0', denom: 'GNOT' },
      }),
    );

    expect(screen.queryByText('Insufficient network fee')).toBeNull();
    expect(screen.getByText('unauthorized: caller is not token owner')).toBeTruthy();
    expect(isSendDisabled()).toBe(true);
  });

  it('disables Send while the fee is still being estimated', () => {
    renderSummary(makeProps({ isLoadingNetworkFee: true, networkFee: null }));

    expect(isSendDisabled()).toBe(true);
  });
});
