import React from 'react';
import { GlobalPopupStyle } from '@styles/global-style';
import theme from '@styles/theme';
import { render } from '@testing-library/react';
import { RecoilRoot } from 'recoil';
import { ThemeProvider } from 'styled-components';
import NetworkFee, { NetworkFeeProps } from './network-fee';

describe('NetworkFee Component', () => {
  it('NetworkFee render', () => {
    const args: NetworkFeeProps = {
      value: '0.0048',
      denom: 'GNOT',
    };

    render(
      <RecoilRoot>
        <GlobalPopupStyle />
        <ThemeProvider theme={theme}>
          <NetworkFee {...args} />
        </ThemeProvider>
      </RecoilRoot>,
    );
  });
});
