import { isAirgapAccount, isMultisigAccount, isSessionAccount } from 'adena-module';
import BigNumber from 'bignumber.js';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useRecoilState } from 'recoil';
import styled from 'styled-components';

import UnknownTokenIcon from '@assets/common-unknown-token.svg';
import IconDeposit from '@assets/icon-deposit';
import IconSend from '@assets/icon-send';
import IconSign from '@assets/icon-sign';
import { CHAIN_ICON_MAP, COSMOS_TOKEN_ICON_MAP } from '@assets/icons/cosmos-icons';
import { MainActionButton, OfflineBanner } from '@components/atoms';
import MainManageTokenButton from '@components/pages/main/main-manage-token-button/main-manage-token-button';
import MainNetworkLabel from '@components/pages/main/main-network-label/main-network-label';
import MainTokenBalance from '@components/pages/main/main-token-balance/main-token-balance';
import TokenList, { TokenListItemState } from '@components/pages/wallet-main/token-list/token-list';
import useAppNavigate from '@hooks/use-app-navigate';
import { useCurrentAccount } from '@hooks/use-current-account';
import { useLoadImages } from '@hooks/use-load-images';
import { useNetwork } from '@hooks/use-network';
import { usePreventHistoryBack } from '@hooks/use-prevent-history-back';
import { useTokenBalance } from '@hooks/use-token-balance';
import { useTokenMetainfo } from '@hooks/use-token-metainfo';
import { useIsCurrentSessionRevoked } from '@hooks/wallet/use-current-session-revoked';
import { WalletState } from '@states';
import mixins from '@styles/mixins';
import { revokedDimStyle } from '@styles/session-revoked';
import { RoutePath } from '@types';

// `updateAllTokenMetainfos` walks the account's full transfer history to find
// tokens the wallet has never seen — expensive, and not a balance read. The
// initial pass runs in `initTokenMetainfos` on every account/network change;
// this is only the safety net for a token arriving while the wallet sits open.
const TOKEN_DISCOVERY_INTERVAL = 60_000;
const ROW_COUNT_CACHE_KEY = 'walletMain.tokenRowCount';

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

// The network label is position: fixed, so the flow reserves its slot with
// padding instead. Named because the offline banner sticks to the bottom of
// that same slot and the two must not drift apart.
const NETWORK_LABEL_SLOT_HEIGHT = 37;
// `main` gets `padding: 0 20px` from GlobalPopupStyle; full-bleed children
// cancel it.
const MAIN_SIDE_PADDING = 20;

const Wrapper = styled.main<{ $dimmed: boolean }>`
  padding-top: ${NETWORK_LABEL_SLOT_HEIGHT}px;
  text-align: center;
  overflow: auto;

  ${revokedDimStyle}

  .offline-banner-slot {
    /* Full-bleed, because a warning bar that stops short of both edges reads as
       a card rather than a bar, and its bottom border stops working as a
       divider. The negative margins exactly cancel the global main padding, so
       the slot spans the scrollport without overflowing it.

       Sticky with top: 0 pins it at the top of this element's own flow
       position — the bottom of the slot reserved above — so nothing moves at
       rest and the warning survives scrolling the token list. A positive
       offset would push it down by that much instead, opening a gap for
       content to scroll through. Below the label (z-index 10) and the header
       (20), above the scrolling content. */
    position: sticky;
    top: 0;
    z-index: 9;
    margin: 0 -${MAIN_SIDE_PADDING}px 12px;
  }

  /* Online, the banner renders null. Collapse the slot so it costs no space. */
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

  const tokens = useMemo(() => {
    return currentBalances
      .filter((tokenBalance) => tokenBalance.display)
      .map((tokenBalance) => {
        const isCosmos = tokenBalance.networkId !== currentNetwork.networkId;
        const hasAmount = tokenBalance.amount.value !== '';
        const parsed = hasAmount ? BigNumber(tokenBalance.amount.value) : null;
        // Treat non-finite values as a load failure — a malformed balance
        // string would otherwise stringify to "NaN" and leak into the row.
        const displayValue = !parsed ? '' : parsed.isFinite() ? parsed.toFormat() : '-';
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
        };
      });
  }, [currentBalances, getTokenImage, currentNetwork]);

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

  // A STALE BALANCE MUST NOT LOOK LIKE A FRESH ONE. The Gno query sets
  // keepPreviousData, so when a fetch fails or is paused the last good figure
  // stays on screen — rendered identically to one just confirmed. Offline that
  // produced the wallet's worst asymmetry: ATONE showed "-" because its fetch
  // reported an error, while GNOT showed a confident number nobody could
  // currently verify. The token ROW already respects errorNetworkIds; this
  // headline read straight from the cached amount and bypassed it.
  //
  // Zero is exactly where this matters most. An account with no record on chain
  // and an account whose balance could not be fetched both render "0", and only
  // one of those is a fact.
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
        <MainTokenBalance
          amount={{
            value: mainBalanceValue,
            denom: mainTokenBalance === null ? '' : mainTokenBalance.denom,
          }}
          loading={isMainBalanceLoading}
        />
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
          itemStateByTokenId={itemStateByTokenId}
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
