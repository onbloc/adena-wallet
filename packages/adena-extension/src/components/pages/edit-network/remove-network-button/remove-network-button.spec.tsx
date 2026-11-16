import React from 'react';
import { Provider as JotaiProvider } from 'jotai';
import { ThemeProvider } from 'styled-components';
import { render } from '@testing-library/react';
import theme from '@styles/theme';
import { GlobalPopupStyle } from '@styles/global-style';
import RemoveNetworkButton, { RemoveNetworkButtonProps } from './remove-network-button';

describe('RemoveNetworkButton Component', () => {
  it('RemoveNetworkButton render', () => {
    const args: RemoveNetworkButtonProps = {
      text: '',
      clearNetwork: () => {
        return;
      },
    };

    render(
      <JotaiProvider>
        <GlobalPopupStyle />
        <ThemeProvider theme={theme}>
          <RemoveNetworkButton {...args} />
        </ThemeProvider>
      </JotaiProvider>,
    );
  });
});
