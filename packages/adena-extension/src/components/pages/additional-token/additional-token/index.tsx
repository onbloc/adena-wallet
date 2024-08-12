import React from 'react';
import { AdditionalTokenWrapper } from './additional-token.styles';
import AdditionalTokenSelectBox from '@components/pages/additional-token/additional-token-select-box/additional-token-select-box';
import AdditionalTokenInfo from '@components/pages/additional-token/additional-token-info/additional-token-info';
import { SubHeader } from '@components/atoms';
import LeftArrowIcon from '@assets/arrowL-left.svg';
import { AdditionalTokenProps } from '@types';
import { makeDisplayPackagePath } from '@common/utils/string-utils';

const AdditionalToken: React.FC<AdditionalTokenProps> = ({
  opened,
  selected,
  keyword,
  tokenInfos,
  selectedTokenInfo,
  onChangeKeyword,
  onClickOpenButton,
  onClickListItem,
  onClickBack,
  onClickCancel,
  onClickAdd,
}) => {
  return (
    <AdditionalTokenWrapper>
      <div className='sub-header-container'>
        <SubHeader
          title='Add Custom Token'
          leftElement={{
            element: <img src={LeftArrowIcon} alt={'back icon'} />,
            onClick: onClickBack,
          }}
        />
      </div>

      <div className='select-box-wrapper'>
        <AdditionalTokenSelectBox
          opened={opened}
          selected={selected}
          keyword={keyword}
          tokenInfos={tokenInfos}
          selectedInfo={selectedTokenInfo || null}
          onChangeKeyword={onChangeKeyword}
          onClickOpenButton={onClickOpenButton}
          onClickListItem={onClickListItem}
        />
      </div>
      <div className='info-wrapper'>
        <AdditionalTokenInfo
          symbol={selectedTokenInfo?.symbol || ''}
          path={makeDisplayPackagePath(selectedTokenInfo?.pathInfo || '')}
          decimals={selectedTokenInfo ? `${selectedTokenInfo.decimals}` : ''}
        />
      </div>
      <div className='button-group'>
        <button className='cancel-button' onClick={onClickCancel}>
          Cancel
        </button>
        <button className={selected ? 'add-button' : 'add-button disabled'} onClick={onClickAdd}>
          Add
        </button>
      </div>
    </AdditionalTokenWrapper>
  );
};

export default AdditionalToken;
