import React from 'react';
import { GlobalPopupStyle } from '@styles/global-style';
import theme from '@styles/theme';
import { UseQueryResult } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import { RecoilRoot } from 'recoil';
import { ThemeProvider } from 'styled-components';
import NFTTransferSummary, { NFTTransferSummaryProps } from './nft-transfer-summary';

describe('NFTTransferSummary Component', () => {
  it('NFTTransferSummary render', () => {
    const args: NFTTransferSummaryProps = {
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
        value: '0.0048',
        denom: 'GNOT',
      },
      memo: '',
      queryGRC721TokenUri: () => ({}) as unknown as UseQueryResult<string | null>,
      onClickBack: () => {
        return;
      },
      onClickCancel: () => {
        return;
      },
      onClickSend: () => {
        return;
      },
    };

    render(
      <RecoilRoot>
        <GlobalPopupStyle />
        <ThemeProvider theme={theme}>
          <NFTTransferSummary {...args} />
        </ThemeProvider>
      </RecoilRoot>,
    );
  });
});
