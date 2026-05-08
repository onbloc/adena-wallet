import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import styled from 'styled-components';

import { RoutePath } from '@types';
import { getTheme } from '@styles/theme';
import mixins from '@styles/mixins';
import {
  AccountSelectorButton,
  NetworkIconButton,
} from '@components/atoms';
import IconCopy from '@assets/icon-copy';
import { AccountAddressesPopover } from '@components/pages/router/top-menu/account-addresses-popover';
import {
  decodeParameter,
  formatNickname,
  getSiteName,
  parseParameters,
} from '@common/utils/client-utils';
import { useCurrentAccount } from '@hooks/use-current-account';
import { useAdenaContext } from '@hooks/use-context';
import { useAccountName } from '@hooks/use-account-name';
import { useAccountChainAddresses } from '@hooks/use-account-chain-addresses';
import { useNetwork } from '@hooks/use-network';

const COSMOS_APPROVE_PATHS: string[] = [
  RoutePath.ApproveEstablishCosmos,
  RoutePath.ApproveSignCosmos,
  RoutePath.ApproveGetCosmosKey,
];

const extractCosmosChainId = (encodedData: string | undefined): string | undefined => {
  if (!encodedData) return undefined;
  const decoded = decodeParameter(encodedData);
  const data = decoded?.data;
  if (typeof data?.chainId === 'string' && data.chainId) {
    return data.chainId;
  }
  if (Array.isArray(data?.chainIds) && typeof data.chainIds[0] === 'string') {
    return data.chainIds[0];
  }
  return undefined;
};

const Wrapper = styled.div`
  width: 100%;
  height: 100%;
  padding: 0px 20px;
  border-bottom: 1px solid ${getTheme('neutral', '_7')};
`;

const Header = styled.div`
  ${mixins.flex({ direction: 'row', justify: 'space-between' })};
  width: 100%;
  height: 100%;
`;

const StyledLeftSideWrapper = styled.div`
  ${mixins.flex({ direction: 'row', align: 'center', justify: 'flex-start' })};
  gap: 8px;
  height: 100%;
`;

const StyledRightSideWrapper = styled.div`
  ${mixins.flex({ direction: 'row', align: 'center', justify: 'flex-start' })};
  gap: 12px;
  height: 100%;
`;

const StyledCopyIconButton = styled.button.withConfig({
  shouldForwardProp: (prop) => prop !== 'isActive',
})<{ isActive?: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  padding: 0;
  background: none;
  border: none;
  cursor: pointer;
  color: ${({ isActive, theme }): string => (isActive ? theme.neutral._1 : theme.neutral.a)};
  flex-shrink: 0;

  &:hover {
    color: ${getTheme('neutral', '_1')};
  }

  svg {
    width: 14px;
    height: 14px;
  }
`;

const ApproveMenu = (): JSX.Element => {
  const { establishService, establishAtomOneService } = useAdenaContext();
  const { currentAccount } = useCurrentAccount();
  const [accountName, setAccountName] = useState('');
  const [isEstablished, setIsEstablished] = useState(false);
  const location = useLocation();
  const [requestData, setRequestData] = useState<any>();
  const { accountNames } = useAccountName();
  const { currentNetwork } = useNetwork();

  const copyButtonRef = useRef<HTMLButtonElement>(null);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [popoverX, setPopoverX] = useState(0);
  const [popoverY, setPopoverY] = useState(0);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const chainAddressEntries = useAccountChainAddresses();

  useEffect(() => {
    if (location.search) {
      const data = parseParameters(location.search);
      setRequestData(data);
    }
  }, [location]);

  useEffect(() => {
    if (requestData) {
      updateEstablishState();
    }
  }, [requestData, currentAccount, currentNetwork]);

  useEffect(() => {
    if (!currentAccount) return;
    setAccountName(accountNames[currentAccount.id] || currentAccount.name);
  }, [currentAccount, accountNames]);

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!popoverOpen) return;
    const onKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') setPopoverOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [popoverOpen]);

  const isCosmosApproveRoute = useMemo(
    () => COSMOS_APPROVE_PATHS.includes(location.pathname),
    [location.pathname],
  );

  const updateEstablishState = async (): Promise<void> => {
    if (!requestData?.hostname) return;
    const id = currentAccount?.id ?? '';
    const siteName = getSiteName(requestData.protocol, requestData.hostname);

    if (isCosmosApproveRoute) {
      const chainId = extractCosmosChainId(requestData.data);
      if (!chainId) {
        setIsEstablished(false);
        return;
      }
      try {
        const established = await establishAtomOneService.isEstablishedBy(id, siteName, chainId);
        setIsEstablished(established);
      } catch {
        setIsEstablished(false);
      }
      return;
    }

    const currentIsEstablished = await establishService.isEstablishedBy(id, siteName);
    setIsEstablished(currentIsEstablished);
  };

  const scheduleClose = useCallback(() => {
    closeTimerRef.current = setTimeout(() => setPopoverOpen(false), 120);
  }, []);

  const cancelClose = useCallback(() => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }, []);

  const handleCopyIconMouseEnter = useCallback(() => {
    cancelClose();
    if (copyButtonRef.current) {
      const rect = copyButtonRef.current.getBoundingClientRect();
      const POPOVER_WIDTH = 220;
      const iconCenterX = rect.left + rect.width / 2;
      const popoverLeft = (window.innerWidth - POPOVER_WIDTH) / 2;
      setPopoverX(iconCenterX - popoverLeft);
      setPopoverY(rect.bottom + 16);
    }
    setPopoverOpen(true);
  }, [cancelClose]);

  const handleCopyIconMouseLeave = useCallback(() => {
    scheduleClose();
  }, [scheduleClose]);

  const displayHostname = useMemo(() => {
    const h = requestData?.hostname ?? '';
    if (!h || h.startsWith('chrome-extension') || !h.includes('.')) {
      return 'chrome-extension';
    }
    return h;
  }, [requestData?.hostname]);

  return (
    <Wrapper>
      <Header>
        <StyledLeftSideWrapper>
          <AccountSelectorButton name={formatNickname(accountName, 12)} />
          <StyledCopyIconButton
            ref={copyButtonRef}
            type='button'
            isActive={popoverOpen}
            onMouseEnter={handleCopyIconMouseEnter}
            onMouseLeave={handleCopyIconMouseLeave}
            aria-label='Copy address'
          >
            <IconCopy />
          </StyledCopyIconButton>
        </StyledLeftSideWrapper>
        <StyledRightSideWrapper>
          <NetworkIconButton isConnected={isEstablished} hostname={displayHostname} />
        </StyledRightSideWrapper>
      </Header>
      <AccountAddressesPopover
        open={popoverOpen}
        positionX={popoverX}
        positionY={popoverY}
        onMouseEnter={cancelClose}
        onMouseLeave={scheduleClose}
        entries={chainAddressEntries}
      />
    </Wrapper>
  );
};

export default ApproveMenu;
