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
      useNetworkFeeReturn: {
        currentGasPrice: {
          amount: '0.0048',
          denom: 'GNOT',
        },
        networkFee: {
          amount: '0.0048',
          denom: 'GNOT',
        },
        currentGasPriceRawAmount: 4800,
        changedGasPrice: null,
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
