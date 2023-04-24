import React from 'react';
import { ManageTokenLayoutWrapper } from './manage-token-layout.styles';

export interface ManageTokenLayoutProps {
  manageTokenSearch: React.ReactNode;
}

const ManageTokenLayout: React.FC<ManageTokenLayoutProps> = ({ manageTokenSearch }) => {
  return (
    <ManageTokenLayoutWrapper>
      <div className='manage-token-search-container'>{manageTokenSearch}</div>
    </ManageTokenLayoutWrapper>
  );
};

export default ManageTokenLayout;