import React from 'react';
import { GlobalPopupStyle } from '@styles/global-style';
import theme from '@styles/theme';
import { render } from '@testing-library/react';
import { RecoilRoot } from 'recoil';
import { ThemeProvider } from 'styled-components';
import NetworkFeeCustomInput, { NetworkFeeCustomInputProps } from './network-fee-custom-input';

describe('NetworkFeeCustomInput Component', () => {
  it('NetworkFeeCustomInput render', () => {
    const args: NetworkFeeCustomInputProps = {
      value: '0.0001',
      onChange: () => {
        return;
      },
    };

    render(
      <RecoilRoot>
        <GlobalPopupStyle />
        <ThemeProvider theme={theme}>
          <NetworkFeeCustomInput {...args} />
        </ThemeProvider>
      </RecoilRoot>,
    );
  });
});
