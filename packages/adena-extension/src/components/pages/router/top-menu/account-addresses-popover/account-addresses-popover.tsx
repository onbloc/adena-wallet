import IconCopy from '@assets/icon-copy';
import IconCopyCheck from '@assets/icon-copy-check';
import { CHAIN_ICON_MAP } from '@assets/icons/cosmos-icons';
import { formatAddress } from '@common/utils/client-utils';
import { Portal } from '@components/atoms';
import { ChainAddressEntry } from '@hooks/use-account-chain-addresses';
import React, { useCallback, useEffect, useState } from 'react';
import { ChainRow, PopoverWrapper } from './account-addresses-popover.styles';

const CHAIN_SHORT_NAME: Record<string, string> = {
  gno: 'Gno.land',
  atomone: 'AtomOne',
};

const COPY_FEEDBACK_MS = 2000;

interface AccountAddressesPopoverProps {
  open: boolean;
  positionX: number;
  positionY: number;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  entries: ChainAddressEntry[];
}

export const AccountAddressesPopover: React.FC<AccountAddressesPopoverProps> = ({
  open,
  positionX,
  positionY,
  onMouseEnter,
  onMouseLeave,
  entries,
}) => {
  if (!open || entries.length === 0) return null;

  return (
    <Portal selector='portal-popup'>
      <PopoverWrapper
        $caretX={positionX}
        $positionY={positionY}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
      >
        {entries.map((entry) => (
          <ChainAddressRow key={entry.id ?? entry.chain.id} entry={entry} />
        ))}
      </PopoverWrapper>
    </Portal>
  );
};

const ChainAddressRow: React.FC<{ entry: ChainAddressEntry }> = ({ entry }) => {
  const { chain, address, label } = entry;
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) {
      return;
    }

    const timer = setTimeout(() => setCopied(false), COPY_FEEDBACK_MS);
    return () => {
      clearTimeout(timer);
    };
  }, [copied]);

  // The whole right cell (truncated address + icon) is the copy target, so users
  // no longer have to hit the small icon. Copy the full, non-truncated address.
  const onClickCopy = useCallback(() => {
    setCopied(true);
    navigator.clipboard.writeText(address);
  }, [address]);

  return (
    <ChainRow>
      <div className='chain-left'>
        <img
          className='chain-icon'
          src={CHAIN_ICON_MAP[chain.id] ?? chain.chainIconUrl}
          alt={chain.displayName}
        />
        <span className='chain-name'>
          {label ?? CHAIN_SHORT_NAME[chain.chainGroup] ?? chain.displayName}
        </span>
      </div>
      <button
        type='button'
        className={copied ? 'chain-right copied' : 'chain-right'}
        onClick={onClickCopy}
        aria-label={`Copy ${chain.displayName} address`}
      >
        <span className='address'>{formatAddress(address, 6)}</span>
        {copied ? <IconCopyCheck /> : <IconCopy />}
      </button>
    </ChainRow>
  );
};
