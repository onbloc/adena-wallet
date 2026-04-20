import { CHAIN_ICON_MAP } from '@assets/icons/cosmos-icons';
import { CopyIconButton, Portal } from '@components/atoms';
import { formatAddress } from '@common/utils/client-utils';
import { ChainAddressEntry } from '@hooks/use-account-chain-addresses';
import React from 'react';
import { ChainRow, PopoverWrapper } from './account-addresses-popover.styles';

const CHAIN_SHORT_NAME: Record<string, string> = {
  gno: 'Gno.land',
  atomone: 'AtomOne',
};

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
        {entries.map(({ chain, address }) => (
          <ChainRow key={chain.id}>
            <div className='chain-left'>
              <img
                className='chain-icon'
                src={CHAIN_ICON_MAP[chain.id] ?? chain.chainIconUrl}
                alt={chain.displayName}
              />
              <span className='chain-name'>
                {CHAIN_SHORT_NAME[chain.chainGroup] ?? chain.displayName}
              </span>
            </div>
            <div className='chain-right'>
              <span className='address'>{formatAddress(address, 6)}</span>
              <CopyIconButton copyText={address} size={14} />
            </div>
          </ChainRow>
        ))}
      </PopoverWrapper>
    </Portal>
  );
};
