import React from 'react';
import { AdditionalTokenInfoWrapper, AdditionalTokenInfoItemWrapper } from './additional-token-info.styles';

export interface AdditionalTokenInfoProps {
  symbol: string;
  path: string;
  decimals: string;
}

export interface AdditionalTokenInfoBlockProps {
  title: string;
  value: string;
}

const AdditionalTokenInfoBlock: React.FC<AdditionalTokenInfoBlockProps> = ({
  title,
  value
}) => {
  return (
    <AdditionalTokenInfoItemWrapper>
      <span className='title'>{title}:</span>
      <span className='value'>{value}</span>
    </AdditionalTokenInfoItemWrapper>
  );
};

const AdditionalTokenInfo: React.FC<AdditionalTokenInfoProps> = ({
  symbol,
  path,
  decimals
}) => {
  return (
    <AdditionalTokenInfoWrapper>
      <AdditionalTokenInfoBlock
        title='Token Symbol'
        value={symbol}
      />
      <AdditionalTokenInfoBlock
        title='Token Path'
        value={path}
      />
      <AdditionalTokenInfoBlock
        title='Token Decimals'
        value={decimals}
      />
    </AdditionalTokenInfoWrapper>
  );
};

export default AdditionalTokenInfo;