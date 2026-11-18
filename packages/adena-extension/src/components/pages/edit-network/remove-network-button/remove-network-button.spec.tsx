import { GlobalPopupStyle } from '@styles/global-style';
import theme from '@styles/theme';
import { render } from '@testing-library/react';
import { Provider as JotaiProvider } from 'jotai';
import React from 'react';
import { ThemeProvider } from 'styled-components';

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
