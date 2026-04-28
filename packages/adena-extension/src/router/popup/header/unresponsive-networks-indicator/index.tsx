import React, { useCallback, useEffect, useRef, useState } from 'react';
import styled from 'styled-components';

import { WarningTriangleIcon } from '@components/atoms';
import { fonts, getTheme } from '@styles/theme';
import mixins from '@styles/mixins';
import { UnresponsiveNetworkInfo } from '@hooks/use-network';

interface Props {
  networks: UnresponsiveNetworkInfo[];
}

// Delay closing on mouseleave so the user can move from the trigger into the
// popover without it disappearing. Mirrors the AccountAddressesPopover pattern
// used elsewhere in the header.
const HOVER_CLOSE_DELAY_MS = 120;

const Container = styled.div`
  position: relative;
  display: inline-flex;
  align-items: center;
  height: 100%;
`;

const Trigger = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  cursor: default;
`;

const Popover = styled.div`
  ${mixins.flex({ align: 'flex-start', justify: 'flex-start' })};
  position: absolute;
  top: 36px;
  right: 0;
  width: 220px;
  padding: 10px 12px;
  gap: 6px;
  background: ${getTheme('neutral', '_9')};
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.35);
  z-index: 30;

  .title {
    ${fonts.body2Reg};
    color: ${getTheme('neutral', '_1')};
  }

  .item {
    ${fonts.body2Reg};
    color: ${getTheme('neutral', 'a')};
  }
`;

export const UnresponsiveNetworksIndicator: React.FC<Props> = ({ networks }) => {
  const [open, setOpen] = useState(false);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cancelClose = useCallback(() => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }, []);

  const scheduleClose = useCallback(() => {
    cancelClose();
    closeTimerRef.current = setTimeout(() => setOpen(false), HOVER_CLOSE_DELAY_MS);
  }, [cancelClose]);

  useEffect(() => {
    return (): void => {
      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current);
      }
    };
  }, []);

  if (networks.length === 0) {
    return null;
  }

  return (
    <Container onMouseEnter={cancelClose} onMouseLeave={scheduleClose}>
      <Trigger
        aria-label='Unresponsive networks'
        onMouseEnter={(): void => {
          cancelClose();
          setOpen(true);
        }}
        onMouseLeave={scheduleClose}
      >
        <WarningTriangleIcon size={17} />
      </Trigger>
      {open && (
        <Popover role='dialog' onMouseEnter={cancelClose} onMouseLeave={scheduleClose}>
          <span className='title'>Following networks are unresponsive:</span>
          {networks.map((network) => (
            <span key={network.id} className='item'>
              {network.name}
            </span>
          ))}
        </Popover>
      )}
    </Container>
  );
};

export default UnresponsiveNetworksIndicator;
