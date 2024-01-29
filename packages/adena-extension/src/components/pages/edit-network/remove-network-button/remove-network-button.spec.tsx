import React from 'react';
import { RecoilRoot } from 'recoil';
import { ThemeProvider } from 'styled-components';
import { render } from '@testing-library/react';
import theme from '@styles/theme';
import { GlobalPopupStyle } from '@styles/global-style';
import RemoveNetworkButton, { RemoveNetworkButtonProps } from './remove-network-button';

describe('RemoveNetworkButton Component', () => {
  it('RemoveNetworkButton render', () => {
    const args: RemoveNetworkButtonProps = {
      removeNetwork: () => {
        return;
      },
    };

    render(
      <RecoilRoot>
        <GlobalPopupStyle />
        <ThemeProvider theme={theme}>
          <RemoveNetworkButton {...args} />
        </ThemeProvider>
      </RecoilRoot>,
    );
  });
});
