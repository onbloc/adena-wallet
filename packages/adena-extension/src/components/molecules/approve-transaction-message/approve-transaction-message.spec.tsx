import React from 'react';
import { RecoilRoot } from 'recoil';
import { ThemeProvider } from 'styled-components';
import { render } from '@testing-library/react';
import theme from '@styles/theme';
import { GlobalPopupStyle } from '@styles/global-style';
import ApproveTransactionMessage, { ApproveTransactionMessageProps } from './approve-transaction-message';

describe('ApproveTransactionMessage Component', () => {
  it('ApproveTransactionMessage render', () => {
    const args: ApproveTransactionMessageProps = {
      changeMessage: jest.fn(),
      openScannerLink: jest.fn(),
      index: 0,
      message: {
        type: '/vm.m_call',
        value: {
          args: [],
          caller: '',
          func: '',
          pkg_path: '',
          max_deposit: '',
          send: '',
        },
      },
    };

    render(
      <RecoilRoot>
        <GlobalPopupStyle />
        <ThemeProvider theme={theme}>
          <ApproveTransactionMessage {...args} />
        </ThemeProvider>
      </RecoilRoot>,
    );
  });
});