import React from 'react';
import { AdditionalTokenSearchListItemWrapper, AdditionalTokenSearchListWrapper } from './additional-token-search-list.styles';
import { TokenInfo } from '@components/manage-token/additional-token/additional-token';

export interface AdditionalTokenSearchListProps {
  tokenInfos: TokenInfo[];
  onClickListItem: (tokenId: string) => void;
}

interface AdditionalTokenSearchListItem {
  tokenId: string;
  title: string;
  description: string;
  onClickListItem: (tokenId: string) => void;
}

const AdditionalTokenSearchListItem: React.FC<AdditionalTokenSearchListItem> = ({ tokenId, title, description, onClickListItem }) => {
  return (
    <AdditionalTokenSearchListItemWrapper onClick={() => onClickListItem(tokenId)}>
      <span className='title'>{title}</span>
      <span className='token-id'>{description}</span>
    </AdditionalTokenSearchListItemWrapper>
  )
};

const AdditionalTokenSearchList: React.FC<AdditionalTokenSearchListProps> = ({ tokenInfos, onClickListItem }) => {
  return (
    <AdditionalTokenSearchListWrapper>
      <div className='scroll-wrapper'>
        {
          tokenInfos.map((tokenInfo, index) =>
            <AdditionalTokenSearchListItem
              key={index}
              tokenId={tokenInfo.tokenId}
              title={tokenInfo.title}
              description={tokenInfo.description}
              onClickListItem={onClickListItem}
            />
          )
        }
      </div>
    </AdditionalTokenSearchListWrapper>
  );
};

export default AdditionalTokenSearchList;