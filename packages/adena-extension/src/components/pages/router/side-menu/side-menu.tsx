import React, { useCallback } from 'react';

import IconHelp from '@assets/help-fill.svg';
import IconAdd from '@assets/icon-add';
import IconLock from '@assets/icon-side-menu-lock.svg';
import IconSetting from '@assets/icon-side-menu-setting.svg';
import LogoAdena from '@assets/logo-withIcon.svg';
import IconRestore from '@assets/restore.svg';
import { Icon } from '@components/atoms';
import SideMenuAccountList from '@components/pages/router/side-menu-account-list/side-menu-account-list';
import SideMenuLink from '@components/pages/router/side-menu-link/side-menu-link';
import { RoutePath, SideMenuProps } from '@types';
import { SideMenuWrapper } from './side-menu.styles';

const SideMenu: React.FC<SideMenuProps> = ({
  scannerUrl,
  scannerQueryString,
  locked,
  currentAccountId,
  focusedAccountId,
  accounts,
  movePage,
  focusAccountId,
  openLink,
  openRegister,
  changeAccount,
  lock,
  close,
}) => {
  const moveGnoscan = useCallback(
    (address: string) => {
      const openLinkUrl = scannerQueryString
        ? `${scannerUrl}/account/${address}?${scannerQueryString}`
        : `${scannerUrl}/account/${address}`;
      openLink(openLinkUrl);
    },
    [openLink],
  );

  const moveAccountDetail = useCallback(
    (accountId: string) => {
      movePage(RoutePath.AccountDetails.replace(':accountId', accountId));
    },
    [movePage],
  );

  const onClickClose = useCallback(() => {
    close();
  }, [close]);

  const onClickAddAccount = useCallback(() => {
    openRegister();
    window.close();
  }, [openRegister]);

  const onClickRestoreWallet = useCallback(() => {
    movePage(RoutePath.EnterSeedPhrase);
  }, [movePage]);

  const onClickHelpAndSupport = useCallback(() => {
    openLink('https://docs.adena.app/resources/faq');
  }, [openLink]);

  const onClickSetting = useCallback(() => {
    movePage(RoutePath.Setting);
  }, [movePage]);

  const onClickLockWallet = useCallback(() => {
    lock();
  }, [lock]);

  return (
    <SideMenuWrapper>
      <div className='header-wrapper'>
        <img className='logo' src={LogoAdena} alt='adena logo' />
        <button className='close-button' type='button' onClick={onClickClose}>
          <Icon name='iconCancel' />
        </button>
      </div>

      <div className='content-wrapper'>
        <SideMenuAccountList
          currentAccountId={currentAccountId}
          accounts={accounts}
          focusedAccountId={focusedAccountId}
          changeAccount={changeAccount}
          focusAccountId={focusAccountId}
          moveGnoscan={moveGnoscan}
          moveAccountDetail={moveAccountDetail}
        />
      </div>
      <div className='content-sub-wrapper'>
        {!locked && (
          <div className='add-account-button' onClick={onClickAddAccount}>
            <IconAdd />
            <span className='text'>Add Account</span>
          </div>
        )}
      </div>

      <div className='bottom-wrapper'>
        {locked ? (
          <>
            <SideMenuLink icon={IconRestore} text='Restore Wallet' onClick={onClickRestoreWallet} />
            <SideMenuLink icon={IconHelp} text='Help & Support' onClick={onClickHelpAndSupport} />
          </>
        ) : (
          <>
            <SideMenuLink icon={IconSetting} text='Settings' onClick={onClickSetting} />
            <SideMenuLink icon={IconLock} text='Lock Wallet' onClick={onClickLockWallet} />
          </>
        )}
      </div>
    </SideMenuWrapper>
  );
};

export default SideMenu;
