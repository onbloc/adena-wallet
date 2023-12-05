import React from 'react';
import { RecoilRoot } from 'recoil';
import { ThemeProvider } from 'styled-components';
import { render } from '@testing-library/react';
import theme from '@styles/theme';
import { GlobalStyle } from '@styles/global-style';
import ApproveChangingNetworkItem, { ApproveChangingNetworkItemProps } from './approve-changing-network-item';

describe('ApproveChangingNetworkItem Component', () => {
  it('ApproveChangingNetworkItem render', () => {
    const args: ApproveChangingNetworkItemProps = {
      name: 'Testnet3',
    };

    render(
      <RecoilRoot>
        <GlobalStyle />
        <ThemeProvider theme={theme}>
          <ApproveChangingNetworkItem {...args} />
        </ThemeProvider>
      </RecoilRoot>,
    );
  });
});