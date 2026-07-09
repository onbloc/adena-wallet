import { arrayContentEquals, hasHDPath } from 'adena-module';
import { useCallback, useMemo, useState } from 'react';
import styled from 'styled-components';

import IconSelectAccount from '@assets/web/select-account.svg';
import { View, WebButton, WebImg } from '@components/atoms';
import { WebTitleWithDescription } from '@components/molecules';
import { AccountInfo } from '@components/molecules/select-account-box';
import SelectAccountBox from '@components/molecules/select-account-box/select-account-box';
import { DerivationPathValue } from '@components/molecules/hd-derivation-path-box';
import { useChain } from '@hooks/use-chain';
import { UseAccountImportReturn } from '@hooks/web/use-account-import-screen';
import { useQuery } from '@tanstack/react-query';

const StyledContainer = styled(View)`
  width: 100%;
  row-gap: 24px;
`;

const SelectAccountStep = ({
  useAccountImportScreenReturn,
}: {
  useAccountImportScreenReturn: UseAccountImportReturn;
}): JSX.Element => {
  const chain = useChain();
  const {
    isLoadingAccounts,
    loadedAccounts,
    storedAccounts,
    loadAccounts,
    selectAccount,
    selectedAddresses,
    deriveAddressByPath,
    addAccountByPath,
    onClickNext,
  } = useAccountImportScreenReturn;

  const [derivationMode, setDerivationMode] = useState(false);
  const [derivationPath, setDerivationPath] = useState<DerivationPathValue | null>(null);

  const { data: accountInfos = [] } = useQuery<AccountInfo[]>(
    ['accountImportSelectAccounts', loadedAccounts],
    async () => {
      const accountInfos: AccountInfo[] = [];
      for (const account of loadedAccounts) {
        const address = await account.getAddress(chain.bech32Prefix);
        const accountInfo: AccountInfo = {
          hdPath: hasHDPath(account) ? account.hdPath : account.index,
          accountIndex: hasHDPath(account) ? account.accountIndex : undefined,
          changeIndex: hasHDPath(account) ? account.changeIndex : undefined,
          index: account.index,
          selected: selectedAddresses.includes(address),
          stored: storedAccounts.some((storedAccount) =>
            arrayContentEquals(storedAccount.publicKey, account.publicKey),
          ),
          address,
        };
        accountInfos.push(accountInfo);
      }

      return accountInfos;
    },
    { keepPreviousData: true },
  );

  const accountInfosWithSelection = useMemo(() => {
    return accountInfos.map((accountInfo) => ({
      ...accountInfo,
      selected: selectedAddresses.includes(accountInfo.address),
    }));
  }, [accountInfos, selectedAddresses]);

  const isLoading = useMemo(() => {
    if (accountInfosWithSelection.length === 0) {
      return true;
    }

    return isLoadingAccounts;
  }, [isLoadingAccounts, accountInfosWithSelection]);

  const disabledButton = useMemo(() => {
    if (derivationMode) {
      return derivationPath === null;
    }
    return isLoading || selectedAddresses.length === 0;
  }, [derivationMode, derivationPath, isLoading, selectedAddresses.length]);

  const onClickNextButton = useCallback(() => {
    if (derivationMode) {
      if (derivationPath) {
        addAccountByPath(derivationPath.account, derivationPath.change, derivationPath.addressIndex);
      }
      return;
    }
    onClickNext();
  }, [derivationMode, derivationPath, addAccountByPath, onClickNext]);

  return (
    <StyledContainer>
      <View>
        <WebImg src={IconSelectAccount} size={88} />
      </View>
      <WebTitleWithDescription
        title='Select Accounts'
        description='Select all accounts you wish to add to Adena.'
        marginTop={12}
        marginBottom={-6}
      />
      <SelectAccountBox
        accounts={accountInfosWithSelection}
        isLoading={isLoading}
        loadAccounts={loadAccounts}
        select={selectAccount}
        derivation={{
          active: derivationMode,
          onToggle: (): void => {
            setDerivationPath(null);
            setDerivationMode((prev) => !prev);
          },
          deriveAddress: deriveAddressByPath,
          onChange: setDerivationPath,
        }}
      />
      <WebButton
        figure='primary'
        size='full'
        disabled={disabledButton}
        onClick={onClickNextButton}
        text='Next'
        rightIcon='chevronRight'
      />
    </StyledContainer>
  );
};

export default SelectAccountStep;
