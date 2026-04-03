import { GlobalPopupStyle } from '@styles/global-style';
import theme from '@styles/theme';
import { render } from '@testing-library/react';
import React from 'react';
import { RecoilRoot } from 'recoil';
import { ThemeProvider } from 'styled-components';
import { describe, it } from 'vitest';

import AddCustomNetworkButton, { AddCustomNetworkButtonProps } from './add-custom-network-button';

describe('AddCustomNetworkButton Component', () => {
  it('AddCustomNetworkButton render', () => {
    const args: AddCustomNetworkButtonProps = {
      onClick: () => {
        return;
      },
    };

    render(
      <RecoilRoot>
        <GlobalPopupStyle />
        <ThemeProvider theme={theme}>
          <AddCustomNetworkButton {...args} />
        </ThemeProvider>
      </RecoilRoot>,
    );
  });
});
