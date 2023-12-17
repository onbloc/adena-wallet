import React, { useCallback, useMemo, useState } from 'react';
import {
  SideMenuAccountItemWrapper,
  SideMenuAccountItemMoreInfoWrapper,
} from './side-menu-account-item.styles';
import { Portal, CopyIconButton } from '@components/atoms';
import IconEtc from '@assets/icon-etc';
import IconQRCode from '@assets/icon-qrcode';
import IconLink from '@assets/icon-link';
import { SideMenuAccountItemProps } from '@types';

const SideMenuAccountItem: React.FC<SideMenuAccountItemProps> = ({
  selected,
  account,
  changeAccount,
  moveGnoscan,
  moveAccountDetail,
}) => {
  const { accountId, name, address, balance, type } = account;
  const [openedMoreInfo, setOpenedMoreInfo] = useState(false);
  const [positionX, setPositionX] = useState(0);
  const [positionY, setPositionY] = useState(0);

  const displayName = useMemo(() => {
    return name;
  }, [name]);

  const label = useMemo(() => {
    switch (type) {
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

  const onMouseOut = useCallback(() => {
    setOpenedMoreInfo(false);
  }, [setOpenedMoreInfo]);

  const onClickItem = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      event.preventDefault();
      event.stopPropagation();
      changeAccount(accountId);
      setOpenedMoreInfo(false);
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
      setOpenedMoreInfo(!openedMoreInfo);
    },
    [openedMoreInfo],
  );

  return (
    <SideMenuAccountItemWrapper
      className={selected ? 'selected' : ''}
      onClick={onClickItem}
      onMouseLeave={onMouseOut}
    >
      <div className='info-wrapper'>
        <div className='address-wrapper'>
          <span className='name'>{displayName}</span>
          <CopyIconButton className='copy-button' copyText={address} />
          {label !== null && <span className='label'>{label}</span>}
        </div>
        <div className='balance-wrapper'>
          <span className='balance'>{balance}</span>
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
          <span className='title'>View on Gnoscan</span>
        </div>
        <div className='info-wrapper' onClick={onClickAccountDetails}>
          <IconQRCode />
          <span className='title'>Account Details</span>
        </div>
      </SideMenuAccountItemMoreInfoWrapper>
    </Portal>
  );
};
