import { GlobalPopupStyle } from '@styles/global-style';
import theme from '@styles/theme';
import { render } from '@testing-library/react';
import React from 'react';
import { RecoilRoot } from 'recoil';
import { ThemeProvider } from 'styled-components';
import { describe, it } from 'vitest';

import ApproveChangingNetwork, { ApproveChangingNetworkProps } from './approve-changing-network';

describe('ApproveChangingNetwork Component', () => {
  it('ApproveChangingNetwork render', () => {
    const args: ApproveChangingNetworkProps = {
      fromChain: { name: 'Testnet3' },
      toChain: { name: 'Onbloc Testnet' },
      changeable: true,
      processing: false,
      done: false,
      changeNetwork: () => {
        return;
      },
      cancel: () => {
        return;
      },
      onResponse: () => {
        return;
      },
      onTimeout: () => {
        return;
      }
    };

    render(
      <RecoilRoot>
        <GlobalPopupStyle />
        <ThemeProvider theme={theme}>
          <ApproveChangingNetwork {...args} />
        </ThemeProvider>
      </RecoilRoot>
    );
  });
});
