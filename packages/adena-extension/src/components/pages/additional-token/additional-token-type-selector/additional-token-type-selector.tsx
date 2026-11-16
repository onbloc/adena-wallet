import React, { useCallback } from 'react';
import {
  StyledAdditionalTokenTypeSelector,
  StyledAdditionalTokenTypeSelectorWrapper,
} from './additional-token-type-selector.styles';

export enum AddingType {
  'SEARCH',
  'MANUAL',
}

const displayTypeNames = {
  [AddingType.SEARCH]: 'Search',
  [AddingType.MANUAL]: 'Manual',
};

export interface AdditionalTokenTypeSelectorProps {
  type: AddingType;
  setType: (type: AddingType) => void;
}

const AdditionalTokenTypeSelector: React.FC<AdditionalTokenTypeSelectorProps> = ({
  type,
  setType,
}) => {
  const types: AddingType[] = [AddingType.SEARCH, AddingType.MANUAL];

  const onClickSelector = useCallback(
    (selected: AddingType) => {
      if (selected === type) {
        return;
      }
      setType(selected);
    },
    [type],
  );

  return (
    <StyledAdditionalTokenTypeSelectorWrapper>
      {types.map((item, index) => (
        <StyledAdditionalTokenTypeSelector
          key={index}
          className={item === type ? 'selected' : ''}
          onClick={(): void => onClickSelector(item)}
        >
          {displayTypeNames[item]}
        </StyledAdditionalTokenTypeSelector>
      ))}
    </StyledAdditionalTokenTypeSelectorWrapper>
  );
};

export default AdditionalTokenTypeSelector;
