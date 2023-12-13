import React from 'react';
import AccountDetailsLayout from '@layouts/account-details-layout/account-details-layout';
import AccountDetailsContainer from './account-details-container';

export default function AccountDetailsPage(): JSX.Element {
  return <AccountDetailsLayout accountDetailsContainer={<AccountDetailsContainer />} />;
}
