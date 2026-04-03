import { GlobalPopupStyle } from '@styles/global-style';
import theme from '@styles/theme';
import { render } from '@testing-library/react';
import React from 'react';
import { RecoilRoot } from 'recoil';
import { ThemeProvider } from 'styled-components';
import { describe, it } from 'vitest';

import ChangeNetwork, { ChangeNetworkProps } from './change-network';

describe('ChangeNetwork Component', () => {
  it('ChangeNetwork render', () => {
    const args: ChangeNetworkProps = {
      loading: false,
      currentNetworkId: '',
      networkMetainfos: [],
      changeNetwork: () => {
        return;
      },
      moveEditPage: () => {
        return;
      },
      moveAddPage: () => {
        return;
      },
      moveBack: () => {
        return;
      }
    };

    render(
      <RecoilRoot>
        <GlobalPopupStyle />
        <ThemeProvider theme={theme}>
          <ChangeNetwork {...args} />
        </ThemeProvider>
      </RecoilRoot>
    );
  });
});
