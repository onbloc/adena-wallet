import React from 'react';

import { SideMenuAccountListWrapper } from './side-menu-account-list.styles';
import SideMenuAccountItem from '../side-menu-account-item/side-menu-account-item';
import { SideMenuAccountListProps } from '@types';

const SideMenuAccountList: React.FC<SideMenuAccountListProps> = ({
  currentAccountId,
  accounts,
  changeAccount,
  moveGnoscan,
  moveAccountDetail,
}) => {
  return (
    <SideMenuAccountListWrapper>
      {accounts.map((account, index) => (
        <SideMenuAccountItem
          key={index}
          selected={account.accountId === currentAccountId}
          account={account}
          changeAccount={changeAccount}
          moveGnoscan={moveGnoscan}
          moveAccountDetail={moveAccountDetail}
        />
      ))}
    </SideMenuAccountListWrapper>
  );
};

export default SideMenuAccountList;
