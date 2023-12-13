import React from 'react';
import { ManageTokenLayout } from '@components/pages/manage-token-layout';
import ManageTokenSearchContainer from './manage-token-search-container';

export default function ManageToken(): JSX.Element {
  return (
    <ManageTokenLayout>
      <ManageTokenSearchContainer />
    </ManageTokenLayout>
  );
}
