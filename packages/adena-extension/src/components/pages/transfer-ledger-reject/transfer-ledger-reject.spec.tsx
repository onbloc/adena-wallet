import {
  describe, it,
} from 'vitest';
import {
  GlobalPopupStyle,
} from '@styles/global-style';
import theme from '@styles/theme';
import {
  render,
} from '@testing-library/react';
import React from 'react';
import {
  RecoilRoot,
} from 'recoil';
import {
  ThemeProvider,
} from 'styled-components';

import TransferLedgerReject, {
  TransferLedgerRejectProps,
} from './transfer-ledger-reject';

describe('TransferLedgerReject Component', () => {
  it('TransferLedgerReject render', () => {
    const args: TransferLedgerRejectProps = {
      onClickClose: () => {
        return;
      },
    };

    render(
      <RecoilRoot>
        <GlobalPopupStyle />
        <ThemeProvider theme={theme}>
          <TransferLedgerReject {...args} />
        </ThemeProvider>
      </RecoilRoot>,
    );
  });
});
