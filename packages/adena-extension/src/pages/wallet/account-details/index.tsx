import React from 'react';

import { CommonFullContentLayout } from '@components/atom';
import AccountDetailsContainer from './account-details-container';

export default function AccountDetailsPage(): JSX.Element {
  return (
    <CommonFullContentLayout>
      <AccountDetailsContainer />
    </CommonFullContentLayout>
  );
}
