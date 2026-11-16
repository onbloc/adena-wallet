import { GlobalPopupStyle } from '@styles/global-style';
import theme from '@styles/theme';
import { render } from '@testing-library/react';
import { Provider as JotaiProvider } from 'jotai';
import React from 'react';
import { ThemeProvider } from 'styled-components';

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
      <JotaiProvider>
        <GlobalPopupStyle />
        <ThemeProvider theme={theme}>
          <ChangeNetwork {...args} />
        </ThemeProvider>
      </JotaiProvider>,
    );
  });
});
