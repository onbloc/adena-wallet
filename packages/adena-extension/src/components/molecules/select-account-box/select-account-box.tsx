import React, { useCallback } from 'react';

import IconArrowDown from '@assets/arrowS-down-gray.svg';
import IconLoadingCircle from '@assets/web/loading-circle.svg';
import { WebImg, WebText } from '@components/atoms';
import {
  DerivationPathValue,
  HDDerivationPathBox,
} from '@components/molecules/hd-derivation-path-box';

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

// When provided, a "Set Derivation Path" action toggles an inline path editor.
// While it is active (`active === true`) the account list and its actions are
// disabled — the user adds a single account at the entered path instead.
export interface DerivationPathControl {
  active: boolean;
  onToggle: () => void;
  deriveAddress: (account: number, change: number, addressIndex: number) => Promise<string>;
  onChange: (path: DerivationPathValue | null) => void;
}

export interface SelectAccountBoxProps {
  isLoading: boolean;
  accounts: AccountInfo[];
  select: (address: string) => void;
  loadAccounts: () => Promise<void>;
  derivation?: DerivationPathControl;
}

const SelectAccountBox: React.FC<SelectAccountBoxProps> = ({
  accounts,
  isLoading,
  select,
  loadAccounts,
  derivation,
}) => {
  const theme = useTheme();
  const hasAccount = accounts.length > 0;
  const derivationActive = derivation?.active ?? false;

  const onClickLoadMore = useCallback(() => {
    if (isLoading || derivationActive) {
      return;
    }

    return loadAccounts();
  }, [isLoading, derivationActive, loadAccounts]);

  return (
    <StyledSelectAccountBox>
      <StyledSelectAccountContent>
        {hasAccount ? (
          accounts.map((account, index) => (
            <SelectAccountBoxItem
              key={index}
              account={account}
              select={select}
              disabled={derivationActive}
            />
          ))
        ) : (
          <WebText type='body4'>No data to display</WebText>
        )}
      </StyledSelectAccountContent>

      <StyledActionRow>
        <StyledLoadMore onClick={onClickLoadMore} disabled={isLoading || derivationActive}>
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

        {derivation && (
          <StyledTextButton type='button' onClick={derivation.onToggle} disabled={derivationActive}>
            <WebText color={theme.webNeutral._500} type='body5'>
              Set Derivation Path
            </WebText>
          </StyledTextButton>
        )}
      </StyledActionRow>

      {derivation && derivationActive && (
        <HDDerivationPathBox
          deriveAddress={derivation.deriveAddress}
          onChange={derivation.onChange}
          onClose={derivation.onToggle}
        />
      )}
    </StyledSelectAccountBox>
  );
};

export default SelectAccountBox;
