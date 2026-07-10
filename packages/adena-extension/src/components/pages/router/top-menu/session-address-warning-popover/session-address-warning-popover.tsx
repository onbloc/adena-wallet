import { Portal } from '@components/atoms';
import React from 'react';
import { WarningPopoverWrapper } from './session-address-warning-popover.styles';

// A SessionAccount address can never receive tokens, so the header copy affordance
// is replaced by this warning instead of copying an address on hover.
interface SessionAddressWarningPopoverProps {
  open: boolean;
  positionX: number;
  positionY: number;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}

export const SessionAddressWarningPopover: React.FC<SessionAddressWarningPopoverProps> = ({
  open,
  positionX,
  positionY,
  onMouseEnter,
  onMouseLeave,
}) => {
  if (!open) return null;

  return (
    <Portal selector='portal-popup'>
      <WarningPopoverWrapper
        $caretX={positionX}
        $positionY={positionY}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
      >
        <span className='warning-text'>
          Do not send tokens to your Session Account. Use the <b>Master Account’s</b> address to
          receive tokens.
        </span>
      </WarningPopoverWrapper>
    </Portal>
  );
};
