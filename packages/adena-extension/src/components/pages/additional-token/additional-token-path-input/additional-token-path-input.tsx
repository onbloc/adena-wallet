import { Text } from '@components/atoms';
import theme from '@styles/theme';
import React, { useMemo } from 'react';
import { AdditionalTokenPathInputWrapper } from './additional-token-path-input.styles';

export interface AdditionalTokenPathInputProps {
  keyword: string;
  onChangeKeyword: (keyword: string) => void;
  errorMessage: string | null;
}

const AdditionalTokenPathInput: React.FC<AdditionalTokenPathInputProps> = ({
  keyword,
  onChangeKeyword,
  errorMessage,
}) => {
  const hasError = useMemo(() => {
    return !!errorMessage;
  }, [errorMessage]);

  return (
    <AdditionalTokenPathInputWrapper>
      <input
        className={hasError ? 'search-input error' : 'search-input'}
        value={keyword}
        onChange={(event): void => onChangeKeyword(event.target.value)}
        placeholder='Search'
      />

      {hasError && (
        <Text className='error-message' type='body2Reg' color={theme.red._5}>
          {errorMessage}
        </Text>
      )}
    </AdditionalTokenPathInputWrapper>
  );
};

export default AdditionalTokenPathInput;
