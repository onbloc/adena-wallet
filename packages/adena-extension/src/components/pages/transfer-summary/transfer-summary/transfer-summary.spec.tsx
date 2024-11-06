import { GlobalPopupStyle } from '@styles/global-style';
import theme from '@styles/theme';
import { render } from '@testing-library/react';
import { RecoilRoot } from 'recoil';
import { ThemeProvider } from 'styled-components';
import TransferSummary, { TransferSummaryProps } from './transfer-summary';

describe('TransferSummary Component', () => {
  it('TransferSummary render', () => {
    const args: TransferSummaryProps = {
      tokenMetainfo: {
        main: true,
        tokenId: 'tokenId',
        networkId: 'DEFAULT',
        name: 'gno.land',
        image: '',
        symbol: 'GNOT',
        type: 'gno-native',
        decimals: 6,
        display: true,
      },
      tokenImage: '',
      transferBalance: {
        value: '4,000.123',
        denom: 'GNOT',
      },
      toAddress: '',
      networkFee: {
        value: '0.0048',
        denom: 'GNOT',
      },
      memo: '',
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
          <TransferSummary {...args} />
        </ThemeProvider>
      </RecoilRoot>,
    );
  });
});
