import React from 'react';
import { ManageTokenAddedLayoutWrapper } from './manage-token-added-layout.styles';

export interface ManageTokenAddedLayoutProps {
  manageTokenAdded: React.ReactNode;
}

const ManageTokenAddedLayout: React.FC<ManageTokenAddedLayoutProps> = ({ manageTokenAdded }) => {
  return (
    <ManageTokenAddedLayoutWrapper>
      <div className='manage-token-added-container'>
        {manageTokenAdded}
      </div>
    </ManageTokenAddedLayoutWrapper>
  );
};

export default ManageTokenAddedLayout;