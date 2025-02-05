import React from 'react';
import {
  AdditionalTokenInfoItemWrapper,
  AdditionalTokenInfoWrapper,
  TokenInfoValueLoadingBox,
} from './additional-token-info.styles';

export interface AdditionalTokenInfoProps {
  isLoading: boolean;
  symbol: string;
  path: string;
  decimals: string;
}

export interface AdditionalTokenInfoBlockProps {
  isLoading: boolean;
  title: string;
  value: string;
}

const AdditionalTokenInfoBlock: React.FC<AdditionalTokenInfoBlockProps> = ({
  title,
  value,
  isLoading,
}) => {
  return (
    <AdditionalTokenInfoItemWrapper>
      <span className='title'>{title}:</span>

      {isLoading ? <TokenInfoValueLoadingBox /> : <span className='value'>{value}</span>}
    </AdditionalTokenInfoItemWrapper>
  );
};

const AdditionalTokenInfo: React.FC<AdditionalTokenInfoProps> = ({
  isLoading,
  symbol,
  path,
  decimals,
}) => {
  return (
    <AdditionalTokenInfoWrapper>
      <AdditionalTokenInfoBlock title='Token Symbol' value={symbol} isLoading={isLoading} />
      <AdditionalTokenInfoBlock title='Token Path' value={path} isLoading={isLoading} />
      <AdditionalTokenInfoBlock title='Token Decimals' value={decimals} isLoading={isLoading} />
    </AdditionalTokenInfoWrapper>
  );
};

export default AdditionalTokenInfo;
