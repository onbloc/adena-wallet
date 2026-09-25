import { isAirgapAccount, isMultisigAccount, isSessionAccount } from 'adena-module';
import BigNumber from 'bignumber.js';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRecoilState } from 'recoil';
import styled from 'styled-components';

import UnknownTokenIcon from '@assets/common-unknown-token.svg';
import IconDeposit from '@assets/icon-deposit';
import IconSend from '@assets/icon-send';
import IconSign from '@assets/icon-sign';
import { CHAIN_ICON_MAP, COSMOS_TOKEN_ICON_MAP } from '@assets/icons/cosmos-icons';
import {
  aggregateTokenValues,
  getTokenPriceKey,
  makeTokenValue,
  PortfolioValue,
} from '@common/utils/price-utils';
import { MainActionButton, OfflineBanner } from '@components/atoms';
import MainManageTokenButton from '@components/pages/main/main-manage-token-button/main-manage-token-button';
import MainNetworkLabel from '@components/pages/main/main-network-label/main-network-label';
import MainTokenBalance from '@components/pages/main/main-token-balance/main-token-balance';
import MainTotalPrice from '@components/pages/main/main-total-price/main-total-price';
import TokenList, { TokenListItemState } from '@components/pages/wallet-main/token-list/token-list';
import useAppNavigate from '@hooks/use-app-navigate';
import { useCurrentAccount } from '@hooks/use-current-account';
import { getPortfolioBalanceState } from '@hooks/helpers/portfolio-balance-state';
import { useLoadImages } from '@hooks/use-load-images';
import { useNetwork } from '@hooks/use-network';
import { usePreventHistoryBack } from '@hooks/use-prevent-history-back';
import { useTokenBalance } from '@hooks/use-token-balance';
import { useTokenMetainfo } from '@hooks/use-token-metainfo';
import { useTokenPrices } from '@hooks/use-token-prices';
import { useChainBlockTime } from '@hooks/wallet/use-chain-block-time';
import { useIsCurrentSessionRevoked } from '@hooks/wallet/use-current-session-revoked';
import { useVestingInfo } from '@hooks/wallet/use-vesting-info';
import { WalletState } from '@states';
import mixins from '@styles/mixins';
import { revokedDimStyle } from '@styles/session-revoked';
import { MainToken, RoutePath, TokenPriceRequest, TokenValue } from '@types';

// `updateAllTokenMetainfos` walks the account's full transfer history to find
// tokens the wallet has never seen — expensive, and not a balance read. The
// initial pass runs in `initTokenMetainfos` on every account/network change;
// this is only the safety net for a token arriving while the wallet sits open.
const TOKEN_DISCOVERY_INTERVAL = 60_000;
const ROW_COUNT_CACHE_KEY = 'walletMain.tokenRowCount';
// The vesting panel needs the chain's clock, not the device's. It is polled
// once a second while a panel is open so Spendable keeps moving, and slowly the
// rest of the time so opening a panel finds a value already cached.
const VESTING_BLOCK_TIME_OPEN_INTERVAL = 1_000;
const VESTING_BLOCK_TIME_IDLE_INTERVAL = 30_000;

// Read the last known visible token row count synchronously so the first
// frame can reserve N placeholder rows. This keeps the list height stable
// across cold starts where tokenMetainfos hydrate from chrome.storage and
// would otherwise grow row-by-row (0 → 1 → 3) as Gno + Cosmos arrive.
function readCachedRowCount(): number {
  if (typeof window === 'undefined') return 0;
  try {
    const raw = window.localStorage.getItem(ROW_COUNT_CACHE_KEY);
    const parsed = raw ? Number(raw) : 0;
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
  } catch {
    return 0;
  }
}

// The network label is position: fixed, so the flow reserves its slot with padding.
const NETWORK_LABEL_SLOT_HEIGHT = 37;
// `main` gets `padding: 0 20px` from GlobalPopupStyle; full-bleed children cancel it.
const MAIN_SIDE_PADDING = 20;

const Wrapper = styled.main<{ $dimmed: boolean }>`
  padding-top: ${NETWORK_LABEL_SLOT_HEIGHT}px;
  text-align: center;
  overflow: auto;

  ${revokedDimStyle}

  /* Negative margins cancel the global main padding so the bar spans the
     scrollport. top: 0 holds it at its own flow position (the bottom of the
     reserved slot); a positive offset would push it down and open a gap for
     content to scroll through. z-index stays under the label (10). */
  .offline-banner-slot {
    position: sticky;
    top: 0;
    z-index: 9;
    margin: 0 -${MAIN_SIDE_PADDING}px 12px;
  }

  /* The banner renders null when online. */
  .offline-banner-slot:empty {
    display: none;
  }

  .network-label-wrapper {
    position: fixed;
    width: 100%;
    height: auto;
    top: 48px;
    left: 0;
    background-color: ${({ theme }): string => theme.neutral._8};
    z-index: 10;
  }

  .token-balance-wrapper {
    display: flex;
    align-items: center;
    justify-content: flex-start;
  }

  .main-button-wrapper {
    ${mixins.flex({ direction: 'row', justify: 'space-between' })};
    width: 100%;
    gap: 8px;
    margin: 14px 0px 30px;
  }

  .manage-token-button-wrapper {
    display: flex;
    margin: 24px auto 60px auto;
    align-items: center;
    justify-content: center;
  }
`;

export const WalletMain = (): JSX.Element => {
  usePreventHistoryBack();
  const { navigate } = useAppNavigate();
  const [state] = useRecoilState(WalletState.state);
  const { currentNetwork } = useNetwork();
  const { currentAccount } = useCurrentAccount();
  const {
    mainTokenBalance,
    mainTokenUnavailable,
    currentBalances,
    loadingTokenKeys,
    errorNetworkIds,
  } = useTokenBalance();
  const { failedNetwork } = useNetwork();
  const { updateAllTokenMetainfos, getTokenImage } = useTokenMetainfo();

  const networkUnresponsive = failedNetwork === true;
  const sessionRevoked = useIsCurrentSessionRevoked();
  const actionsDisabled = networkUnresponsive || sessionRevoked;
  // A SessionAccount address can never receive tokens, so depositing to it is
  // blocked; users deposit to the Master Account instead.
  const isSession = useMemo(
    () => (currentAccount ? isSessionAccount(currentAccount) : false),
    [currentAccount],
  );

  const { addLoadingImages, completeImageLoading } = useLoadImages();

  // Null for every account without a grant, which is all but a handful; the
  // native token row reveals the padlock and expander only when it is set.
  const { vestingInfo } = useVestingInfo();
  // The open panel lives here rather than inside the row so the block-time poll
  // can follow it, and so the rows stay presentational.
  const [expandedVestingTokenId, setExpandedVestingTokenId] = useState<string | null>(null);
  const blockTimeSec = useChainBlockTime(
    !!vestingInfo,
    expandedVestingTokenId === null
      ? VESTING_BLOCK_TIME_IDLE_INTERVAL
      : VESTING_BLOCK_TIME_OPEN_INTERVAL,
  );

  const onToggleVesting = useCallback((tokenId: string) => {
    setExpandedVestingTokenId((prev) => (prev === tokenId ? null : tokenId));
  }, []);

  // An account with no grant has no panel to keep open.
  useEffect(() => {
    if (!vestingInfo) {
      setExpandedVestingTokenId(null);
    }
  }, [vestingInfo]);

  // Captured once on first render — never updates so the placeholder count
  // can't shift while metainfos hydrate.
  const cachedRowCountRef = useRef<number>(readCachedRowCount());

  const showSignTxButton = useMemo(() => {
    if (!currentAccount) return false;

    return !isAirgapAccount(currentAccount) && !isMultisigAccount(currentAccount);
  }, [currentAccount]);

  const onClickDepositButton = (): void =>
    navigate(RoutePath.WalletSearch, { state: { type: 'deposit' } });

  const onClickActionButton = (): void => {
    if (!currentAccount) {
      return;
    }
    if (isAirgapAccount(currentAccount)) {
      navigate(RoutePath.BroadcastTransaction);
      return;
    }
    if (isMultisigAccount(currentAccount)) {
      navigate(RoutePath.BroadcastMultisigTransactionScreen);
      return;
    }
    navigate(RoutePath.WalletSearch, { state: { type: 'send' } });
  };

  const onClickSignButton = (): void => {
    if (!currentAccount) {
      return;
    }

    navigate(RoutePath.SignMultisigTransactionScreen);
    return;
  };

  const actionButtonText: string | null = useMemo(() => {
    if (!currentAccount) {
      return null;
    }

    if (isMultisigAccount(currentAccount)) {
      return 'Broadcast';
    }

    return 'Send';
  }, [isMultisigAccount, currentAccount]);

  useEffect(() => {
    if (state === 'CREATE') {
      navigate(RoutePath.Home);
    }
  }, [state]);

  useEffect(() => {
    if (!currentAccount?.id || !currentNetwork.chainId) {
      return;
    }

    const interval = setInterval(() => {
      updateAllTokenMetainfos();
    }, TOKEN_DISCOVERY_INTERVAL);

    return (): void => {
      clearInterval(interval);
    };
  }, [currentAccount?.id, currentNetwork.chainId]);

  const displayedBalances = useMemo(
    () => currentBalances.filter((tokenBalance) => tokenBalance.display),
    [currentBalances],
  );

  // Only rows on screen are quoted; hidden tokens are not part of the total.
  // `decimals` rides along because a token quoted under another asset (wugnot
  // under GNOT) needs it to restate that asset's price in its own unit.
  const priceRequests = useMemo<TokenPriceRequest[]>(
    () =>
      displayedBalances.map(({ tokenId, networkId, decimals }) => ({
        tokenId,
        networkId,
        decimals,
      })),
    [displayedBalances],
  );

  const { tokenPrices } = useTokenPrices(priceRequests);

  const tokens = useMemo<MainToken[]>(() => {
    return displayedBalances.map((tokenBalance) => {
      const isCosmos = tokenBalance.networkId !== currentNetwork.networkId;
      const hasAmount = tokenBalance.amount.value !== '';
      const parsed = hasAmount ? BigNumber(tokenBalance.amount.value) : null;
      // Treat non-finite values as a load failure — a malformed balance
      // string would otherwise stringify to "NaN" and leak into the row.
      const displayValue = !parsed ? '' : parsed.isFinite() ? parsed.toFormat() : '-';
      // No usable balance means no USD value either.
      const tokenValue = parsed?.isFinite()
        ? makeTokenValue(
            displayValue,
            tokenPrices[getTokenPriceKey(tokenBalance.tokenId, tokenBalance.networkId)],
          )
        : null;
      return {
        tokenId: tokenBalance.tokenId,
        logo:
          getTokenImage(tokenBalance) ||
          COSMOS_TOKEN_ICON_MAP[tokenBalance.tokenId] ||
          `${UnknownTokenIcon}`,
        name: tokenBalance.name,
        balanceAmount: {
          value: displayValue,
          // When fetch errored the row's amount is EMPTY_AMOUNT (denom='').
          // Fall back to the token's own symbol so the error state can read
          // "⚠ - ATONE" instead of dropping the unit entirely.
          denom: tokenBalance.amount.denom || tokenBalance.symbol,
        },
        chainIconUrl: isCosmos ? CHAIN_ICON_MAP[tokenBalance.networkId] : undefined,
        tokenValue,
        // A grant lives on the Gno account, so only the native row can show it.
        vesting: !isCosmos && tokenBalance.main ? vestingInfo : null,
      };
    });
  }, [displayedBalances, tokenPrices, getTokenImage, currentNetwork, vestingInfo]);

  // Null when nothing on screen is quoted: keep the native-balance headline.
  const portfolioValue = useMemo<PortfolioValue | null>(() => {
    const values = tokens
      .map((token) => token.tokenValue)
      .filter((tokenValue): tokenValue is TokenValue => !!tokenValue);

    return values.length === 0 ? null : aggregateTokenValues(values);
  }, [tokens]);

  // What the headline can honestly claim about the balances feeding it: a
  // failed refresh makes the total stale, and a balance that has not arrived
  // makes it partial. The row-level "-" and skeleton already say which holding
  // is affected; this says whether the total itself can be trusted.
  const { unavailable: portfolioUnavailable, incomplete: portfolioIncomplete } = useMemo(
    () =>
      getPortfolioBalanceState(displayedBalances, tokenPrices, errorNetworkIds, loadingTokenKeys),
    [displayedBalances, tokenPrices, errorNetworkIds, loadingTokenKeys],
  );

  // One quoted token switches the whole screen into USD display mode. The list
  // must not mix two row shapes, so unquoted rows keep the USD layout and read
  // "-" where their value would be.
  const usdDisplayMode = portfolioValue !== null;

  const itemStateByTokenId = useMemo<Record<string, TokenListItemState>>(() => {
    const map: Record<string, TokenListItemState> = {};
    for (const tokenBalance of currentBalances) {
      const key = `${tokenBalance.tokenId}:${tokenBalance.networkId}`;
      const error = errorNetworkIds.has(tokenBalance.networkId);
      map[tokenBalance.tokenId] = {
        loading: !error && loadingTokenKeys.has(key),
        error,
      };
    }
    return map;
  }, [currentBalances, loadingTokenKeys, errorNetworkIds]);

  const tokenImages = useMemo(() => {
    return tokens.map((token) => token.logo);
  }, [tokens]);

  const onClickTokenListItem = useCallback(
    (tokenId: string) => {
      const tokenBalance = currentBalances.find((tokenBalance) => tokenBalance.tokenId === tokenId);
      if (!tokenBalance) {
        window.alert('Token not found');
        return;
      }
      navigate(RoutePath.TokenDetails, {
        state: { tokenBalance },
      });
    },
    [navigate, currentBalances],
  );

  const onClickManageButton = useCallback(() => {
    navigate(RoutePath.ManageToken);
  }, [navigate]);

  useEffect(() => {
    addLoadingImages(tokenImages);
  }, [tokenImages.length]);

  useEffect(() => {
    if (tokens.length === 0) return;
    try {
      window.localStorage.setItem(ROW_COUNT_CACHE_KEY, String(tokens.length));
    } catch {
      // Storage may be unavailable (private mode, quota); placeholder count
      // simply stays at its previous value next mount.
    }
  }, [tokens.length]);

  // keepPreviousData keeps the last good figure on screen when a fetch fails or
  // pauses, rendered identically to a confirmed one. The token rows already
  // respect errorNetworkIds; this headline read the cached amount directly.
  const gnoBalanceUnavailable = mainTokenUnavailable;
  const isMainBalanceLoading = mainTokenBalance === null && !gnoBalanceUnavailable;
  // Same NaN guard as the row mapping above — a malformed numeric string
  // would otherwise render as the literal "NaN" in the headline balance.
  const mainBalanceValue = ((): string => {
    if (gnoBalanceUnavailable) return '-';
    if (mainTokenBalance === null) return '';
    const parsed = BigNumber(mainTokenBalance.value);
    return parsed.isFinite() ? parsed.toFormat() : '-';
  })();

  return (
    <Wrapper $dimmed={sessionRevoked}>
      <div className='offline-banner-slot'>
        <OfflineBanner />
      </div>
      <div className='network-label-wrapper'>
        <MainNetworkLabel
          networkName={currentNetwork.networkName}
          onClick={(): void => navigate(RoutePath.ChangeNetwork)}
        />
      </div>
      <div className='token-balance-wrapper'>
        {portfolioValue ? (
          <MainTotalPrice
            value={portfolioValue}
            unavailable={portfolioUnavailable}
            loading={portfolioIncomplete}
          />
        ) : (
          <MainTokenBalance
            amount={{
              value: mainBalanceValue,
              denom: mainTokenBalance === null ? '' : mainTokenBalance.denom,
            }}
            loading={isMainBalanceLoading}
          />
        )}
      </div>

      <div className='main-button-wrapper'>
        <MainActionButton
          icon={<IconDeposit />}
          label='Deposit'
          onClick={onClickDepositButton}
          disabled={actionsDisabled || isSession}
        />
        <MainActionButton
          icon={<IconSend />}
          label={actionButtonText ?? ''}
          onClick={onClickActionButton}
          disabled={actionsDisabled}
        />
        {showSignTxButton && (
          <MainActionButton
            icon={<IconSign />}
            label='Sign'
            onClick={onClickSignButton}
            disabled={actionsDisabled}
          />
        )}
      </div>

      <div className='token-list-wrapper'>
        <TokenList
          tokens={tokens}
          usdDisplay={usdDisplayMode}
          itemStateByTokenId={itemStateByTokenId}
          expandedVestingTokenId={expandedVestingTokenId}
          blockTimeSec={blockTimeSec}
          onToggleVesting={onToggleVesting}
          placeholderCount={cachedRowCountRef.current}
          disabled={actionsDisabled}
          completeImageLoading={completeImageLoading}
          onClickTokenItem={onClickTokenListItem}
        />
      </div>

      <div className='manage-token-button-wrapper'>
        <MainManageTokenButton onClick={onClickManageButton} disabled={actionsDisabled} />
      </div>
    </Wrapper>
  );
};
