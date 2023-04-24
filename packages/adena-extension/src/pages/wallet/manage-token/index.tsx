import React from 'react';
import ManageTokenLayout from '@layouts/manage-token-layout/manage-token-layout';
import ManageTokenSearchContainer from '@containers/manage-token-search-container/manage-token-search-container';

export default function ManageToken() {
  return (
    <ManageTokenLayout
      manageTokenSearch={<ManageTokenSearchContainer />}
    />
  );
}