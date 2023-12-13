import React from 'react';
import styled from 'styled-components';

import TransferInputContainer from './transfer-input-container';

const TransferInputLayoutWrapper = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
  height: auto;
  padding: 24px 20px;
`;

const TransferInput: React.FC = () => {
  return (
    <TransferInputLayoutWrapper>
      <div>
        <TransferInputContainer />
      </div>
    </TransferInputLayoutWrapper>
  );
};

export default TransferInput;
