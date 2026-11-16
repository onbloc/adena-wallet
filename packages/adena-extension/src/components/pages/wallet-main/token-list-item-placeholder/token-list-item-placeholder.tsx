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

// Mirrors TokenListItem's structure: the wrapper is a column that holds the
// row, so the skeleton pieces have to sit inside `.item-row` to lay out
// horizontally. `$disabled` drops the hover highlight and the pointer cursor,
// which a placeholder has no use for.
const TokenListItemPlaceholder: React.FC = () => (
  <TokenListItemWrapper $disabled>
    <div className='item-row'>
      <div className='logo-wrapper'>
        <LogoSkeleton aria-hidden />
      </div>
      <div className='name-wrapper'>
        <TextSkeleton aria-hidden />
      </div>
      <div className='balance-wrapper'>
        <TextSkeleton aria-hidden />
      </div>
    </div>
  </TokenListItemWrapper>
);

export default TokenListItemPlaceholder;
