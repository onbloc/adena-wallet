import { GlobalPopupStyle } from '@styles/global-style';
import theme from '@styles/theme';
import { render, screen } from '@testing-library/react';
import { Provider as JotaiProvider } from 'jotai';
import React from 'react';
import { ThemeProvider } from 'styled-components';

import MainTokenBalance, { MainTokenBalanceProps } from './main-token-balance';

function renderMainBalance(props: MainTokenBalanceProps): ReturnType<typeof render> {
  return render(
    <JotaiProvider>
      <GlobalPopupStyle />
      <ThemeProvider theme={theme}>
        <MainTokenBalance {...props} />
      </ThemeProvider>
    </JotaiProvider>,
  );
}

describe('MainTokenBalance Component', () => {
  it('renders amount when loaded', () => {
    renderMainBalance({
      amount: { value: '240,255.241155', denom: 'GNOT' },
    });
  });

  it('renders skeleton when loading', () => {
    renderMainBalance({
      amount: { value: '', denom: '' },
      loading: true,
    });

    expect(screen.getByLabelText('Loading balance')).not.toBeNull();
  });
});
