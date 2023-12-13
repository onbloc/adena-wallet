import React from 'react';
import { ManageTokenLayout } from '@components/pages/manage-token-layout';
import ManageTokenAddedContainer from './manage-token-added-container';

export default function ManageTokenAdded(): JSX.Element {
  return (
    <ManageTokenLayout>
      <ManageTokenAddedContainer />
    </ManageTokenLayout>
  );
}
