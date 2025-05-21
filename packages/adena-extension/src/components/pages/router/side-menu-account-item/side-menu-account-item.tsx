import React, { useCallback, useEffect, useMemo, useState } from 'react';

import IconEtc from '@assets/icon-etc';
import IconLink from '@assets/icon-link';
import IconQRCode from '@assets/icon-qrcode';
import { CopyIconButton, Portal } from '@components/atoms';
import { SideMenuAccountItemProps } from '@types';

import { GNOT_TOKEN } from '@common/constants/token.constant';
import { TokenBalance } from '@components/molecules';
import { useTheme } from 'styled-components';
import {
  SideMenuAccountItemMoreInfoWrapper,
  SideMenuAccountItemWrapper,
} from './side-menu-account-item.styles';

const SideMenuAccountItem: React.FC<SideMenuAccountItemProps> = ({
  selected,
  account,
  focusedAccountId,
  changeAccount,
  focusAccountId,
  moveGnoscan,
  moveAccountDetail,
}) => {
  const theme = useTheme();
  const { accountId, name, address, balance, type } = account;
  const [openedMoreInfo, setOpenedMoreInfo] = useState(false);
  const [positionX, setPositionX] = useState(0);
  const [positionY, setPositionY] = useState(0);

  const displayName = useMemo(() => {
    return name;
  }, [name]);

  const label = useMemo(() => {
    switch (type) {
      case 'AIRGAP':
        return 'Airgap';
      case 'WEB3_AUTH':
        return 'Google';
      case 'PRIVATE_KEY':
        return 'Imported';
      case 'LEDGER':
        return 'Ledger';
      default:
        return null;
    }
  }, [type]);

  const onClickItem = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      event.preventDefault();
      event.stopPropagation();
      changeAccount(accountId);
      focusAccountId(null);
    },
    [changeAccount, account],
  );

  const onClickMore = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      event.preventDefault();
      event.stopPropagation();
      const { x, y } = event.currentTarget.getBoundingClientRect();
      setPositionX(x);
      setPositionY(y);
      focusAccountId(accountId);
    },
    [openedMoreInfo],
  );

  useEffect(() => {
    if (!accountId) {
      return;
    }

    const opened = accountId === focusedAccountId;
    setOpenedMoreInfo(opened);
  }, [accountId, focusedAccountId]);

  useEffect(() => {
    if (accountId !== focusedAccountId) {
      return;
    }

    const closeModal = (): void => {
      focusAccountId(null);
    };

    window.addEventListener('click', closeModal);
    return () => window.removeEventListener('click', closeModal);
  }, [accountId, focusedAccountId, focusAccountId]);

  return (
    <SideMenuAccountItemWrapper className={selected ? 'selected' : ''} onClick={onClickItem}>
      <div className='info-wrapper'>
        <div className='address-wrapper'>
          <span className='name'>{displayName}</span>
          <CopyIconButton
            className='copy-button'
            copyText={address}
            onClick={(): void => focusAccountId(null)}
          />
          {label !== null && <span className='label'>{label}</span>}
        </div>
        <div className='balance-wrapper'>
          {balance === '-' ? (
            <span className='balance'>{balance}</span>
          ) : (
            <TokenBalance
              value={balance}
              denom={GNOT_TOKEN.symbol}
              fontColor={theme.neutral.a}
              orientation='HORIZONTAL'
              minimumFontSize='11px'
              fontStyleKey='body3Reg'
            />
          )}
        </div>
      </div>

      <div className='more-wrapper' onClick={onClickMore}>
        <IconEtc />
        {openedMoreInfo && (
          <SideMenuAccountItemMoreInfo
            accountId={accountId}
            address={address}
            close={(): void => setOpenedMoreInfo(false)}
            moveGnoscan={moveGnoscan}
            moveAccountDetail={moveAccountDetail}
            positionX={positionX}
            positionY={positionY}
          />
        )}
      </div>
    </SideMenuAccountItemWrapper>
  );
};

export default SideMenuAccountItem;

interface SideMenuAccountItemMoreInfoProps {
  accountId: string;
  address: string;
  positionX: number;
  positionY: number;
  close: () => void;
  moveGnoscan: (address: string) => void;
  moveAccountDetail: (accountId: string) => void;
}

const SideMenuAccountItemMoreInfo: React.FC<SideMenuAccountItemMoreInfoProps> = ({
  accountId,
  address,
  positionX,
  positionY,
  moveGnoscan,
  moveAccountDetail,
}) => {
  function onHover(event: React.MouseEvent<HTMLDivElement>): void {
    event.preventDefault();
    event.stopPropagation();
  }

  const onClickAccountDetails = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      event.preventDefault();
      event.stopPropagation();
      moveAccountDetail(accountId);
    },
    [moveAccountDetail, accountId],
  );

  const onClickViewOnGnoscan = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      event.preventDefault();
      event.stopPropagation();
      moveGnoscan(address);
    },
    [moveGnoscan, address],
  );

  return (
    <Portal selector={'portal-popup'}>
      <SideMenuAccountItemMoreInfoWrapper
        positionX={positionX}
        positionY={positionY}
        onMouseOver={onHover}
      >
        <div className='info-wrapper' onClick={onClickViewOnGnoscan}>
          <IconLink />
          <span className='title'>View on GnoScan</span>
        </div>
        <div className='info-wrapper' onClick={onClickAccountDetails}>
          <IconQRCode />
          <span className='title'>Account Details</span>
        </div>
      </SideMenuAccountItemMoreInfoWrapper>
    </Portal>
  );
};
