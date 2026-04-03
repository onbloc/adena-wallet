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

import TransferSummaryAddress, {
  TransferSummaryAddressProps,
} from './transfer-summary-address';

describe('TransferSummaryAddress Component', () => {
  it('TransferSummaryAddress render', () => {
    const args: TransferSummaryAddressProps = {
      toAddress: '',
      memo: '',
    };

    render(
      <RecoilRoot>
        <GlobalPopupStyle />
        <ThemeProvider theme={theme}>
          <TransferSummaryAddress {...args} />
        </ThemeProvider>
      </RecoilRoot>,
    );
  });
});
