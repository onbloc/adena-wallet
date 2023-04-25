import React from 'react';
import { TransferInputLayoutWrapper } from './transfer-input-layout.styles';

export interface TransferInputLayoutProps {
  transaferInput: React.ReactNode;
}

const TransferInputLayout: React.FC<TransferInputLayoutProps> = ({ transaferInput }) => {
  return (
    <TransferInputLayoutWrapper>
      <div className='transfer-input-conatiner-wrppaer'>
        {transaferInput}
      </div>
    </TransferInputLayoutWrapper>
  );
};

export default TransferInputLayout;