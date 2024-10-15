import LeftArrowIcon from '@assets/arrowL-left.svg';
import { makeDisplayPackagePath } from '@common/utils/string-utils';
import { SubHeader } from '@components/atoms';
import AdditionalTokenInfo from '@components/pages/additional-token/additional-token-info/additional-token-info';
import AdditionalTokenSelectBox from '@components/pages/additional-token/additional-token-select-box/additional-token-select-box';
import { AdditionalTokenProps } from '@types';
import React, { useMemo } from 'react';
import AdditionalTokenPathInput from '../additional-token-path-input/additional-token-path-input';
import AdditionalTokenTypeSelector, {
  AddingType,
} from '../additional-token-type-selector/additional-token-type-selector';
import { AdditionalTokenWrapper } from './additional-token.styles';

const AdditionalToken: React.FC<AdditionalTokenProps> = ({
  opened,
  selected,
  addingType,
  keyword,
  manualTokenPath,
  tokenInfos,
  selectedTokenInfo,
  isLoadingManualGRC20Token,
  isErrorManualGRC20Token,
  selectAddingType,
  onChangeKeyword,
  onChangeManualTokenPath,
  onClickOpenButton,
  onClickListItem,
  onClickBack,
  onClickCancel,
  onClickAdd,
}) => {
  const isSearchType = useMemo(() => {
    return addingType === AddingType.SEARCH;
  }, [addingType]);

  const isLoadingTokenInfo = useMemo(() => {
    if (addingType === AddingType.SEARCH) {
      return false;
    }

    return isLoadingManualGRC20Token;
  }, [addingType, isLoadingManualGRC20Token]);

  const tokenPathInputErrorMessage = useMemo(() => {
    if (!isErrorManualGRC20Token) {
      return null;
    }

    return 'Invalid realm path';
  }, [isErrorManualGRC20Token]);

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

      <div className='type-selector-wrapper'>
        <AdditionalTokenTypeSelector type={addingType} setType={selectAddingType} />
      </div>

      <div className='select-box-wrapper'>
        {isSearchType ? (
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
        ) : (
          <AdditionalTokenPathInput
            keyword={manualTokenPath}
            onChangeKeyword={onChangeManualTokenPath}
            errorMessage={tokenPathInputErrorMessage}
          />
        )}
      </div>

      <div className='info-wrapper'>
        <AdditionalTokenInfo
          isLoading={isLoadingTokenInfo}
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
