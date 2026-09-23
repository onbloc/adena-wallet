import React from 'react';
import { GlobalPopupStyle } from '@styles/global-style';
import theme from '@styles/theme';
import { render, screen } from '@testing-library/react';
import { RecoilRoot } from 'recoil';
import { ThemeProvider } from 'styled-components';
import TokenListItem, { TokenListItemProps } from './token-list-item';

const token = {
  tokenId: 'token1',
  logo: 'https://raw.githubusercontent.com/onbloc/gno-token-resource/main/gno-native/images/gnot.svg',
  name: 'Gno.land',
  balanceAmount: {
    value: '240,255.241155',
    denom: 'GNOT',
  },
};

function renderTokenListItem(args: TokenListItemProps): ReturnType<typeof render> {
  return render(
    <RecoilRoot>
      <GlobalPopupStyle />
      <ThemeProvider theme={theme}>
        <TokenListItem {...args} />
      </ThemeProvider>
    </RecoilRoot>,
  );
}

const baseArgs: TokenListItemProps = {
  token,
  completeImageLoading: () => {
    return;
  },
  onClickTokenItem: () => {
    return;
  },
};

describe('TokenListItem Component', () => {
  it('TokenListItem render', () => {
    renderTokenListItem(baseArgs);
  });

  it('leads with the USD value and its 24h change when the token is quoted', () => {
    renderTokenListItem({
      ...baseArgs,
      token: { ...token, tokenValue: { usdValue: 2120252.239, change24h: 3.2941 } },
    });

    expect(screen.getByText('$2,120,252.23')).not.toBeNull();
    expect(screen.getByText('+3.29%')).not.toBeNull();
    expect(screen.getByText('240,255.241155 GNOT')).not.toBeNull();
  });

  it('shows the USD value without a change rate when the feed has no day-old price', () => {
    renderTokenListItem({
      ...baseArgs,
      token: { ...token, tokenValue: { usdValue: 2120252.239, change24h: null } },
    });

    expect(screen.getByText('$2,120,252.23')).not.toBeNull();
    expect(screen.queryByText('0.00%')).toBeNull();
    expect(screen.getByText('240,255.241155 GNOT')).not.toBeNull();
  });

  it('keeps the single-line layout while the quoted row is still loading', () => {
    renderTokenListItem({
      ...baseArgs,
      token: { ...token, tokenValue: { usdValue: 2120252.239, change24h: 3.2941 } },
      loading: true,
    });

    expect(screen.queryByText('$2,120,252.23')).toBeNull();
    expect(screen.getByLabelText('Loading balance')).not.toBeNull();
  });
});
