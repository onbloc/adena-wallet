import React from 'react';
import ManageTokenLayout from '@layouts/manage-token-layout/manage-token-layout';
import ManageTokenAddedContainer from '@containers/manage-token-added-container/manage-token-added-container';

export default function ManageTokenAdded() {
  return (
    <ManageTokenLayout
      manageTokenSearch={<ManageTokenAddedContainer />}
    />
  );
}