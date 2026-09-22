import React from 'react';
import { GlobalPopupStyle } from '@styles/global-style';
import theme from '@styles/theme';
import { fireEvent, render, screen } from '@testing-library/react';
import { RecoilRoot } from 'recoil';
import { ThemeProvider } from 'styled-components';

import { parseVestingSchedule } from '@common/utils/vesting-utils';

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
      usdDisplay: true,
      token: { ...token, tokenValue: { usdValue: 2120252.239, change24h: 3.2941 } },
    });

    expect(screen.getByText('$2,120,252.23')).not.toBeNull();
    expect(screen.getByText('+3.29%')).not.toBeNull();
    expect(screen.getByText('240,255.241155 GNOT')).not.toBeNull();
  });

  it('shows the USD value without a change rate when the feed has no day-old price', () => {
    renderTokenListItem({
      ...baseArgs,
      usdDisplay: true,
      token: { ...token, tokenValue: { usdValue: 2120252.239, change24h: null } },
    });

    expect(screen.getByText('$2,120,252.23')).not.toBeNull();
    expect(screen.queryByText('0.00%')).toBeNull();
    expect(screen.getByText('240,255.241155 GNOT')).not.toBeNull();
  });

  it('keeps the single-line layout while the quoted row is still loading', () => {
    renderTokenListItem({
      ...baseArgs,
      usdDisplay: true,
      token: { ...token, tokenValue: { usdValue: 2120252.239, change24h: 3.2941 } },
      loading: true,
    });

    expect(screen.queryByText('$2,120,252.23')).toBeNull();
    expect(screen.getByLabelText('Loading balance')).not.toBeNull();
  });

  it('keeps the USD layout and reads "-" for an unquoted row in USD display mode', () => {
    renderTokenListItem({ ...baseArgs, usdDisplay: true });

    expect(screen.getByText('-')).not.toBeNull();
    expect(screen.getByText('240,255.241155 GNOT')).not.toBeNull();
    expect(screen.queryByText('0.00%')).toBeNull();
  });

  it('keeps the balance-only layout while USD display mode is off', () => {
    renderTokenListItem({
      ...baseArgs,
      token: { ...token, tokenValue: { usdValue: 2120252.239, change24h: 3.2941 } },
    });

    expect(screen.queryByText('$2,120,252.23')).toBeNull();
    expect(screen.queryByText('+3.29%')).toBeNull();
  });

  describe('vesting', () => {
    const schedule = parseVestingSchedule({
      original_vesting: '106560000000ugnot',
      start_time: '1789225200',
      end_time: '1852383600',
    });
    const vestingToken = {
      ...token,
      vesting: schedule ? { schedule, coins: '110294549738ugnot' } : null,
    };

    it('shows no expander for an account without a grant', () => {
      renderTokenListItem(baseArgs);

      expect(screen.queryByLabelText('Show vesting details')).toBeNull();
    });

    it('reveals the expander when the row carries a schedule', () => {
      renderTokenListItem({ ...baseArgs, token: vestingToken });

      expect(screen.getByLabelText('Show vesting details')).not.toBeNull();
    });

    it('toggles the panel without navigating into token details', () => {
      const onClickTokenItem = jest.fn();
      renderTokenListItem({ ...baseArgs, token: vestingToken, onClickTokenItem });

      fireEvent.click(screen.getByLabelText('Show vesting details'));

      expect(onClickTokenItem).not.toHaveBeenCalled();
      expect(screen.getByLabelText('Hide vesting details')).not.toBeNull();
    });

    // A row whose balance failed to load has nothing to break down.
    it('hides the expander while the row is loading or errored', () => {
      const { rerender } = renderTokenListItem({
        ...baseArgs,
        token: vestingToken,
        loading: true,
      });
      expect(screen.queryByLabelText('Show vesting details')).toBeNull();

      rerender(
        <RecoilRoot>
          <GlobalPopupStyle />
          <ThemeProvider theme={theme}>
            <TokenListItem {...baseArgs} token={vestingToken} error />
          </ThemeProvider>
        </RecoilRoot>,
      );
      expect(screen.queryByLabelText('Show vesting details')).toBeNull();
    });
  });
});
