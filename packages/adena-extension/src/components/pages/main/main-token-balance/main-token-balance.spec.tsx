import React from 'react';
import { RecoilRoot } from 'recoil';
import { ThemeProvider } from 'styled-components';
import { render, screen } from '@testing-library/react';
import theme from '@styles/theme';
import { GlobalPopupStyle } from '@styles/global-style';
import MainTokenBalance, { MainTokenBalanceProps } from './main-token-balance';

function renderMainBalance(props: MainTokenBalanceProps): ReturnType<typeof render> {
  return render(
    <RecoilRoot>
      <GlobalPopupStyle />
      <ThemeProvider theme={theme}>
        <MainTokenBalance {...props} />
      </ThemeProvider>
    </RecoilRoot>,
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
