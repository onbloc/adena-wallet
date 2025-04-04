import React from 'react';
import { GlobalPopupStyle } from '@styles/global-style';
import theme from '@styles/theme';
import { render } from '@testing-library/react';
import { NetworkFeeSettingType } from '@types';
import { RecoilRoot } from 'recoil';
import { ThemeProvider } from 'styled-components';
import { ApproveTransaction, ApproveTransactionProps } from '.';

describe('ApproveTransaction Component', () => {
  it('ApproveTransaction render', () => {
    const args: ApproveTransactionProps = {
      domain: '',
      loading: true,
      logo: '',
      title: 'Sign Transaction',
      memo: '',
      hasMemo: true,
      transactionMessages: [],
      changeTransactionMessages: () => {
        return;
      },
      contracts: [
        {
          type: '/vm.m_call',
          function: 'GetBoardIDFromName',
          value: '',
        },
      ],
      networkFee: {
        amount: '0.0048',
        denom: 'GNOT',
      },
      transactionData: '',
      opened: false,
      processing: false,
      done: false,
      changeMemo: () => {
        return;
      },
      onResponse: () => {
        return;
      },
      onTimeout: () => {
        return;
      },
      onToggleTransactionData: () => {
        return;
      },
      onClickConfirm: () => {
        return;
      },
      onClickCancel: () => {
        return;
      },
      openScannerLink: jest.fn(),
      useNetworkFeeReturn: {
        isLoading: false,
        isFetchedEstimateGasInfo: true,
        isFetchedPriceTiers: true,
        isSimulateError: false,
        currentGasInfo: {
          gasFee: 0.00000048,
          gasPrice: 0.00000000048,
          gasUsed: 100000,
          gasWanted: 150000,
        },
        networkFee: {
          amount: '0.0048',
          denom: 'GNOT',
        },
        gasAdjustment: '1.5',
        setGasAdjustment: () => {
          return;
        },
        currentGasFeeRawAmount: 4800,
        changedGasInfo: null,
        networkFeeSettingType: NetworkFeeSettingType.AVERAGE,
        networkFeeSettings: [],
        setNetworkFeeSetting: () => {
          return;
        },
        save: () => {
          return;
        },
      },
    };

    render(
      <RecoilRoot>
        <GlobalPopupStyle />
        <ThemeProvider theme={theme}>
          <ApproveTransaction {...args} />
        </ThemeProvider>
      </RecoilRoot>,
    );
  });
});
