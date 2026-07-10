import React, { useCallback } from 'react';

import IconArrowDown from '@assets/arrowS-down-gray.svg';
import IconLoadingCircle from '@assets/web/loading-circle.svg';
import { WebImg, WebText } from '@components/atoms';

import { useTheme } from 'styled-components';
import SelectAccountBoxItem from './select-account-box-item';
import {
  StyledActionRow,
  StyledLoadingWrapper,
  StyledLoadMore,
  StyledSelectAccountBox,
  StyledSelectAccountContent,
  StyledTextButton,
} from './select-account-box.styles';
import { AccountInfo } from './select-account-box.types';

export interface SelectAccountBoxProps {
  isLoading: boolean;
  accounts: AccountInfo[];
  select: (address: string) => void;
  loadAccounts: () => Promise<void>;
  // When provided, a "Set Derivation Path" action toggles the inline editor
  // (rendered by the parent). The account list stays fully interactive.
  onToggleDerivationPath?: () => void;
}

const SelectAccountBox: React.FC<SelectAccountBoxProps> = ({
  accounts,
  isLoading,
  select,
  loadAccounts,
  onToggleDerivationPath,
}) => {
  const theme = useTheme();
  const hasAccount = accounts.length > 0;

  const onClickLoadMore = useCallback(() => {
    if (isLoading) {
      return;
    }

    return loadAccounts();
  }, [isLoading, loadAccounts]);

  return (
    <StyledSelectAccountBox>
      <StyledSelectAccountContent>
        {hasAccount ? (
          accounts.map((account, index) => (
            <SelectAccountBoxItem key={index} account={account} select={select} />
          ))
        ) : (
          <WebText type='body4'>No data to display</WebText>
        )}
      </StyledSelectAccountContent>

      <StyledActionRow>
        <StyledLoadMore onClick={onClickLoadMore} disabled={isLoading}>
          <WebText color={theme.webNeutral._500} type='body5'>
            {isLoading ? 'Loading' : 'Load more accounts'}
          </WebText>
          {!isLoading ? (
            <WebImg src={IconArrowDown} />
          ) : (
            <StyledLoadingWrapper>
              <WebImg src={IconLoadingCircle} />
            </StyledLoadingWrapper>
          )}
        </StyledLoadMore>

        {onToggleDerivationPath && (
          <StyledTextButton type='button' onClick={onToggleDerivationPath}>
            <WebText color={theme.webNeutral._500} type='body5'>
              Set Derivation Path
            </WebText>
          </StyledTextButton>
        )}
      </StyledActionRow>
    </StyledSelectAccountBox>
  );
};

export default SelectAccountBox;
