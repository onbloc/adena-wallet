import React from 'react';
import { RecoilRoot } from 'recoil';
import { ThemeProvider } from 'styled-components';
import { render } from '@testing-library/react';
import theme from '@styles/theme';
import { GlobalPopupStyle } from '@styles/global-style';
import EditNetwork, { EditNetworkProps } from '.';

describe('EditNetwork Component', () => {
  it('EditNetwork render', () => {
    const args: EditNetworkProps = {
      name: '',
      rpcUrl: '',
      chainId: '',
      rpcUrlError: '',
      indexerUrl: '',
      indexerUrlError: '',
      savable: true,
      editType: 'all',
      changeName: () => {
        return;
      },
      changeRPCUrl: () => {
        return;
      },
      changeIndexerUrl: () => {
        return;
      },
      changeChainId: () => {
        return;
      },
      clearNetwork: () => {
        return;
      },
      saveNetwork: () => {
        return;
      },
      moveBack: () => {
        return;
      },
    };

    render(
      <RecoilRoot>
        <GlobalPopupStyle />
        <ThemeProvider theme={theme}>
          <EditNetwork {...args} />
        </ThemeProvider>
      </RecoilRoot>,
    );
  });
});
