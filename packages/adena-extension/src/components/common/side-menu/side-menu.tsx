import React, { useCallback } from 'react';
import { SideMenuWrapper } from './side-menu.styles';
import LogoAdena from '@assets/logo-withIcon.svg';
import Icon from '@components/icons';
import SideMenuAccountList from '@components/common/side-menu-account-list/side-menu-account-list';
import SideMenuLink from '@components/common/side-menu-link/side-menu-link';
import { RoutePath } from '@router/path';
import IconAdd from '@assets/icon-add';
import { KeyringType } from 'adena-module';
import IconSetting from '@assets/icon-side-menu-setting.svg';
import IconLock from '@assets/icon-side-menu-lock.svg';
import IconRestore from '@assets/restore.svg';
import IconHelp from '@assets/help-fill.svg';


export interface SideMenuAccountInfo {
  accountId: string;
  name: string;
  address: string;
  type: KeyringType;
  balance: string;
}

export interface SideMenuProps {
  locked: boolean;
  currentAccountId: string | null;
  accounts: SideMenuAccountInfo[];
  changeAccount: (accountId: string) => void;
  openLink: (link: string) => void;
  movePage: (link: string) => void;
  lock: () => void;
  close: () => void;
}

const SideMenu: React.FC<SideMenuProps> = ({
  locked,
  currentAccountId,
  accounts,
  movePage,
  openLink,
  changeAccount,
  lock,
  close,
}) => {

  const moveGnoscan = useCallback((address: string) => {
    openLink('https://gnoscan.io/accounts/' + address);
  }, [openLink]);

  const moveAccountDetail = useCallback((accountId: string) => {
    movePage(RoutePath.AccountDetails.replace(':accountId', accountId));
  }, [movePage]);

  const onClickClose = useCallback(() => {
    close();
  }, [close]);

  const onClickAddAccount = useCallback(() => {
    movePage(RoutePath.AddAccount);
  }, [movePage]);

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
          changeAccount={changeAccount}
          moveGnoscan={moveGnoscan}
          moveAccountDetail={moveAccountDetail}
        />
      </div>
      <div className='content-sub-wrapper'>
        {
          !locked && (
            <div className='add-account-button' onClick={onClickAddAccount}>
              <IconAdd />
              <span className='text'>Add Account</span>
            </div>
          )
        }
      </div>

      <div className='bottom-wrapper'>
        {
          locked ? (
            <>
              <SideMenuLink icon={IconRestore} text='Restore Wallet' onClick={onClickRestoreWallet} />
              <SideMenuLink icon={IconHelp} text='Help & Support' onClick={onClickHelpAndSupport} />
            </>
          ) : (
            <>
              <SideMenuLink icon={IconSetting} text='Settings' onClick={onClickSetting} />
              <SideMenuLink icon={IconLock} text='Lock Wallet' onClick={onClickLockWallet} />
            </>
          )
        }
      </div>
    </SideMenuWrapper>
  );
};

export default SideMenu;