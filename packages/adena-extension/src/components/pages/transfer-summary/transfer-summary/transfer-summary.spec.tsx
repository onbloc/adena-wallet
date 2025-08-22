
import { GlobalPopupStyle } from '@styles/global-style';
import theme from '@styles/theme';
import { render } from '@testing-library/react';
import { NetworkFeeSettingType } from '@types';
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
        name: 'Gno.land',
        image: '',
        symbol: 'GNOT',
        type: 'gno-native',
        decimals: 6,
        display: true,
      },
      currentBalance: 1000000,
      useNetworkFeeReturn: {
        isLoading: false,
        isSimulateError: false,
        currentGasInfo: null,
        currentGasFeeRawAmount: 0,
        currentStorageDeposits: null,
        changedGasInfo: null,
        networkFee: null,
        networkFeeSettingType: NetworkFeeSettingType.AVERAGE,
        networkFeeSettings: null,
        gasAdjustment: '0',
        setGasAdjustment: () => {
          return;
        },
        setNetworkFeeSetting: () => {
          return;
        },
        save: () => {
          return;
        },
        isFetchedPriceTiers: false,
        isFetchedEstimateGasInfo: false,
      },
      tokenImage: '',
      transferBalance: {
        value: '4,000.123',
        denom: 'GNOT',
      },
      toAddress: '',
      networkFee: {
        amount: '0.0048',
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
      onClickNetworkFeeSetting: () => {
        return;
      },
      isErrorNetworkFee: false,
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
