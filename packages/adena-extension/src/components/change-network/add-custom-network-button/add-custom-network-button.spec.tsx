import React from 'react';
import { RecoilRoot } from 'recoil';
import { ThemeProvider } from 'styled-components';
import { render } from '@testing-library/react';
import theme from '@styles/theme';
import { GlobalStyle } from '@styles/global-style';
import AddCustomNetworkButton, { AddCustomNetworkButtonProps } from './add-custom-network-button';

describe('AddCustomNetworkButton Component', () => {
  it('AddCustomNetworkButton render', () => {
    const args: AddCustomNetworkButtonProps = {
      onClick: () => { return; },
    };

    render(
      <RecoilRoot>
        <GlobalStyle />
        <ThemeProvider theme={theme}>
          <AddCustomNetworkButton {...args} />
        </ThemeProvider>
      </RecoilRoot>,
    );
  });
});