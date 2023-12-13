import React from 'react';
import ManageTokenLayout from '@layouts/manage-token-layout/manage-token-layout';
import ManageTokenSearchContainer from './manage-token-search-container';

export default function ManageToken(): JSX.Element {
  return <ManageTokenLayout manageTokenSearch={<ManageTokenSearchContainer />} />;
}
