import React from 'react';

import { SideMenuAccountListProps } from '@types';
import SideMenuAccountItem from '../side-menu-account-item/side-menu-account-item';
import { SideMenuAccountListWrapper } from './side-menu-account-list.styles';

const SideMenuAccountList: React.FC<SideMenuAccountListProps> = ({
  currentAccountId,
  accounts,
  focusedAccountId,
  changeAccount,
  moveGnoscan,
  focusAccountId,
  moveAccountDetail,
}) => {
  return (
    <SideMenuAccountListWrapper>
      {accounts.map((account, index) => (
        <SideMenuAccountItem
          key={index}
          selected={account.accountId === currentAccountId}
          account={account}
          focusedAccountId={focusedAccountId}
          changeAccount={changeAccount}
          focusAccountId={focusAccountId}
          moveGnoscan={moveGnoscan}
          moveAccountDetail={moveAccountDetail}
        />
      ))}
    </SideMenuAccountListWrapper>
  );
};

export default SideMenuAccountList;
