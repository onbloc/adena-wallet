import {
  describe, it,
} from 'vitest';
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

import AddCustomNetwork, {
  AddCustomNetworkProps,
} from '.';

describe('AddCustomNetwork Component', () => {
  it('AddCustomNetwork render', () => {
    const args: AddCustomNetworkProps = {
      name: '',
      rpcUrl: '',
      rpcUrlError: '',
      indexerUrl: '',
      indexerUrlError: '',
      chainId: '',
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
      save: () => {
        return;
      },
      cancel: () => {
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
          <AddCustomNetwork {...args} />
        </ThemeProvider>
      </RecoilRoot>,
    );
  });
});
