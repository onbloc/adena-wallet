import React from 'react';
import styled from 'styled-components';

import { SkeletonBoxStyle } from '@components/atoms';
import { TokenListItemWrapper } from '../token-list-item/token-list-item.styles';

const LogoSkeleton = styled(SkeletonBoxStyle)`
  width: 34px;
  height: 34px;
  border-radius: 50%;
  padding: 0;
`;

const TextSkeleton = styled(SkeletonBoxStyle)`
  width: 80px;
  height: 17px;
  border-radius: 6px;
  padding: 0;
`;

const PlaceholderWrapper = styled(TokenListItemWrapper)`
  cursor: default;

  &:hover {
    background: ${({ theme }): string => theme.neutral._9};
    cursor: default;
  }
`;

const TokenListItemPlaceholder: React.FC = () => (
  <PlaceholderWrapper>
    <div className='logo-wrapper'>
      <LogoSkeleton aria-hidden />
    </div>
    <div className='name-wrapper'>
      <TextSkeleton aria-hidden />
    </div>
    <div className='balance-wrapper'>
      <TextSkeleton aria-hidden />
    </div>
  </PlaceholderWrapper>
);

export default TokenListItemPlaceholder;
