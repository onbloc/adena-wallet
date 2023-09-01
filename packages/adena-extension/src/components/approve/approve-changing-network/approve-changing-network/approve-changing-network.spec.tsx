import React from 'react';
import { RecoilRoot } from 'recoil';
import { ThemeProvider } from 'styled-components';
import { render } from '@testing-library/react';
import theme from '@styles/theme';
import { GlobalStyle } from '@styles/global-style';
import ApproveChangingNetwork, { ApproveChangingNetworkProps } from './approve-changing-network';
import { action } from '@storybook/addon-actions';

describe('ApproveChangingNetwork Component', () => {
  it('ApproveChangingNetwork render', () => {
    const args: ApproveChangingNetworkProps = {
      fromChain: {
        name: 'Testnet3'
      },
      toChain: {
        name: 'Onbloc Testnet'
      },
      changable: true,
      changeNetwork: action('changeNetwork'),
      cancel: action('cancel'),
    };

    render(
      <RecoilRoot>
        <GlobalStyle />
        <ThemeProvider theme={theme}>
          <ApproveChangingNetwork {...args} />
        </ThemeProvider>
      </RecoilRoot>,
    );
  });
});