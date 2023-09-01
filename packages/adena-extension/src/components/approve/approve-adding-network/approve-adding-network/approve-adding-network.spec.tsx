import React from 'react';
import { RecoilRoot } from 'recoil';
import { ThemeProvider } from 'styled-components';
import { render } from '@testing-library/react';
import theme from '@styles/theme';
import { GlobalStyle } from '@styles/global-style';
import ApproveAddingNetwork, { ApproveAddingNetworkProps } from './approve-adding-network';

describe('ApproveAddingNetwork Component', () => {
  it('ApproveAddingNetwork render', () => {
    const args: ApproveAddingNetworkProps = {
      networkInfo: {
        name: '',
        rpcUrl: '',
        chainId: ''
      },
      logo: '',
      approvable: true,
      approve: () => { return; },
      cancel: () => { return; },
    };

    render(
      <RecoilRoot>
        <GlobalStyle />
        <ThemeProvider theme={theme}>
          <ApproveAddingNetwork {...args} />
        </ThemeProvider>
      </RecoilRoot>,
    );
  });
});