import React from 'react';
import { GlobalPopupStyle } from '@styles/global-style';
import theme from '@styles/theme';
import { render } from '@testing-library/react';
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
