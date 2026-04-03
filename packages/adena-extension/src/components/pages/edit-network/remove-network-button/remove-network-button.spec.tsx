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
import {
  describe, it,
} from 'vitest';

import RemoveNetworkButton, {
  RemoveNetworkButtonProps,
} from './remove-network-button';

describe('RemoveNetworkButton Component', () => {
  it('RemoveNetworkButton render', () => {
    const args: RemoveNetworkButtonProps = {
      text: '',
      clearNetwork: () => {
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
