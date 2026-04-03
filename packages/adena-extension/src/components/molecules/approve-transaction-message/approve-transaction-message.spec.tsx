import { GlobalPopupStyle } from '@styles/global-style';
import theme from '@styles/theme';
import { render } from '@testing-library/react';
import React from 'react';
import { RecoilRoot } from 'recoil';
import { ThemeProvider } from 'styled-components';
import { describe, it, vi } from 'vitest';

import ApproveTransactionMessage, { ApproveTransactionMessageProps } from './approve-transaction-message';

describe('ApproveTransactionMessage Component', () => {
  it('ApproveTransactionMessage render', () => {
    const args: ApproveTransactionMessageProps = {
      changeMessage: vi.fn(),
      openScannerLink: vi.fn(),
      index: 0,
      editable: true,
      message: {
        type: '/vm.m_call',
        value: {
          args: [],
          caller: '',
          func: '',
          pkg_path: '',
          max_deposit: '',
          send: ''
        }
      }
    };

    render(
      <RecoilRoot>
        <GlobalPopupStyle />
        <ThemeProvider theme={theme}>
          <ApproveTransactionMessage {...args} />
        </ThemeProvider>
      </RecoilRoot>
    );
  });
});
