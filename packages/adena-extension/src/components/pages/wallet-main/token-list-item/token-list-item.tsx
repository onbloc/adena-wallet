import React, { useCallback } from 'react';

import IconChevronDown from '@assets/icon-chevron-down';
import AssetIcon from '@components/atoms/asset-icon/asset-icon';
import { TokenChangeRate } from '@components/molecules';
import TokenListItemBalance from '@components/pages/wallet-main/token-list-item-balance/token-list-item-balance';
import { TokenVestingPanel } from '@components/pages/wallet-main/token-vesting-panel';
import { MainToken } from '@types';
import { TokenListItemWrapper, VestingToggleButton } from './token-list-item.styles';

export interface TokenListItemProps {
  token: MainToken;
  /** Screen-wide USD display mode; see TokenListItemBalance. */
  usdDisplay?: boolean;
  loading?: boolean;
  error?: boolean;
  disabled?: boolean;
  /** Whether this row's vesting panel is open; owned by the screen. */
  vestingExpanded?: boolean;
  /** Chain block time for the vesting split; see TokenVestingPanel. */
  blockTimeSec?: number | null;
  completeImageLoading: (imageUrl: string) => void;
  onClickTokenItem: (tokenId: string) => void;
  onToggleVesting?: (tokenId: string) => void;
}

const TokenListItem: React.FC<TokenListItemProps> = ({
  token,
  usdDisplay = false,
  loading = false,
  error = false,
  disabled = false,
  vestingExpanded = false,
  blockTimeSec = null,
  completeImageLoading,
  onClickTokenItem,
  onToggleVesting,
}) => {
  const { tokenId, logo, name, balanceAmount, chainIconUrl, tokenValue, vesting } = token;

  // While loading or errored the row keeps its single-line shape.
  const withPrice = usdDisplay && !loading && !error;
  // An unreadable balance makes the vesting split meaningless, so the affordance
  // only appears once the row has a figure to break down.
  const withVesting = !!vesting && !loading && !error;

  const onLoadImage = (): void => {
    completeImageLoading(logo);
  };

  // Block navigation into token-details when the row's network is unreachable
  // — there is no balance/history to show, and entering would just stack
  // another empty/error screen. Also block when the wallet-level disable flag
  // is on (network outage or revoked-session current account).
  const handleClick = (): void => {
    if (error || disabled) return;
    onClickTokenItem(tokenId);
  };

  // The chevron sits inside the row's click target, so expanding must not also
  // navigate into token-details.
  const handleToggle = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      event.stopPropagation();
      onToggleVesting?.(tokenId);
    },
    [onToggleVesting, tokenId],
  );

  return (
    <TokenListItemWrapper $disabled={error || disabled} $withPrice={withPrice}>
      <div className='item-row' onClick={handleClick}>
        <div className='logo-wrapper'>
          <AssetIcon
            tokenIconUrl={logo}
            chainIconUrl={chainIconUrl}
            onLoad={onLoadImage}
            onError={onLoadImage}
          />
        </div>

        <div className='name-wrapper'>
          <span className='name'>{name}</span>
          {withPrice && tokenValue?.change24h != null && (
            <TokenChangeRate rate={tokenValue.change24h} />
          )}
        </div>

        <div className='balance-wrapper'>
          <TokenListItemBalance
            amount={balanceAmount}
            usdDisplay={withPrice}
            tokenValue={tokenValue}
            loading={loading}
            error={error}
            locked={withVesting}
          />
        </div>

        {withVesting && (
          <VestingToggleButton
            type='button'
            $expanded={vestingExpanded}
            aria-expanded={vestingExpanded}
            aria-label={vestingExpanded ? 'Hide vesting details' : 'Show vesting details'}
            onClick={handleToggle}
          >
            <IconChevronDown />
          </VestingToggleButton>
        )}
      </div>

      {withVesting && (
        <TokenVestingPanel open={vestingExpanded} vesting={vesting} blockTimeSec={blockTimeSec} />
      )}
    </TokenListItemWrapper>
  );
};

export default TokenListItem;
