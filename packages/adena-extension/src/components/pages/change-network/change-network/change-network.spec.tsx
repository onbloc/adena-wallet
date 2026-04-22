import React from 'react';
import { RecoilRoot } from 'recoil';
import { ThemeProvider } from 'styled-components';
import { render } from '@testing-library/react';
import theme from '@styles/theme';
import { GlobalPopupStyle } from '@styles/global-style';
import ChangeNetwork, { ChangeNetworkProps } from './change-network';

describe('ChangeNetwork Component', () => {
  it('ChangeNetwork render', () => {
    const args: ChangeNetworkProps = {
      loading: false,
      networkMode: 'mainnet',
      sections: [],
      onChangeMode: () => {
        return;
      },
      onSelect: () => {
        return;
      },
      onEdit: () => {
        return;
      },
      onAdd: () => {
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
          <ChangeNetwork {...args} />
        </ThemeProvider>
      </RecoilRoot>,
    );
  });
});
