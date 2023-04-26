import React from 'react';
import { TokenDetailsLayoutWrapper } from './token-details-layout.styles';

export interface TokenDetailsLayoutProps {
  tokenDetails: React.ReactNode;
}

const TokenDetailsLayout: React.FC<TokenDetailsLayoutProps> = ({ tokenDetails }) => {
  return (
    <TokenDetailsLayoutWrapper>
      {tokenDetails}
    </TokenDetailsLayoutWrapper>
  );
};

export default TokenDetailsLayout;