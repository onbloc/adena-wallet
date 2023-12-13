import React from 'react';

import { CommonFullContentLayout } from '@components/atom';
import EditCustomNetworkContainer from './edit-custom-network-container';

export default function EditCustomNetworkPage(): JSX.Element {
  return (
    <CommonFullContentLayout>
      <EditCustomNetworkContainer />
    </CommonFullContentLayout>
  );
}
