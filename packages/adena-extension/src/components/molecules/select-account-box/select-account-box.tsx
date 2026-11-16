import React, { useCallback } from 'react';

import IconLoadingCircle from '@assets/web/loading-circle.svg';
import { WebImg, WebText } from '@components/atoms';

import SelectAccountBoxItem from './select-account-box-item';
import {
  StyledActionButton,
  StyledActionLabel,
  StyledActionRow,
  StyledLoadingWrapper,
  StyledSelectAccountBox,
  StyledSelectAccountContent,
} from './select-account-box.styles';
import { AccountInfo } from './select-account-box.types';

export interface SelectAccountBoxProps {
  isLoading: boolean;
  accounts: AccountInfo[];
  select: (address: string) => void;
  loadAccounts: () => Promise<void>;
  onToggleDerivationPath?: () => void;
  derivationActive?: boolean;
}

const SelectAccountBox: React.FC<SelectAccountBoxProps> = ({
  accounts,
  isLoading,
  select,
  loadAccounts,
  onToggleDerivationPath,
  derivationActive = false,
}) => {
  const hasAccount = accounts.length > 0;
  // Load more stays clickable while the derivation-path editor is open; only the
  // "Set Derivation Path" toggle is disabled then.
  const loadMoreDisabled = isLoading;

  const onClickLoadMore = useCallback(() => {
    if (loadMoreDisabled) {
      return;
    }

    return loadAccounts();
  }, [loadMoreDisabled, loadAccounts]);

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
        <StyledActionButton
          type='button'
          onClick={onClickLoadMore}
          disabled={loadMoreDisabled}
          $width={146}
        >
          <StyledActionLabel>{isLoading ? 'Loading' : 'Load more accounts'}</StyledActionLabel>
          {isLoading && (
            <StyledLoadingWrapper>
              <WebImg src={IconLoadingCircle} />
            </StyledLoadingWrapper>
          )}
        </StyledActionButton>

        {onToggleDerivationPath && (
          <StyledActionButton
            type='button'
            onClick={onToggleDerivationPath}
            disabled={derivationActive}
            $width={140}
          >
            <StyledActionLabel>Set Derivation Path</StyledActionLabel>
          </StyledActionButton>
        )}
      </StyledActionRow>
    </StyledSelectAccountBox>
  );
};

export default SelectAccountBox;
