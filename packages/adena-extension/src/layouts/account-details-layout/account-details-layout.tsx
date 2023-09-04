import React from 'react';
import { AccountDetailsLayoutWrapper } from './account-details-layout.styles';

export interface AccountDetailsLayoutProps {
  accountDetailsContainer: React.ReactNode;
}

const AccountDetailsLayout: React.FC<AccountDetailsLayoutProps> = ({
  accountDetailsContainer,
}) => {
  return (
    <AccountDetailsLayoutWrapper>
      {accountDetailsContainer}
    </AccountDetailsLayoutWrapper>
  );
};

export default AccountDetailsLayout;