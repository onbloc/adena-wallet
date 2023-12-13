import React from 'react';
import ManageTokenLayout from '@layouts/manage-token-layout/manage-token-layout';
import ManageTokenAddedContainer from './manage-token-added-container';

export default function ManageTokenAdded(): JSX.Element {
  return <ManageTokenLayout manageTokenSearch={<ManageTokenAddedContainer />} />;
}
