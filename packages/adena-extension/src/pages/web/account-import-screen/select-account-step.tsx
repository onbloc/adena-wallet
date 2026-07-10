import { arrayContentEquals, hasHDPath } from 'adena-module';
import { useCallback, useMemo, useRef, useState } from 'react';
import styled from 'styled-components';

import IconSelectAccount from '@assets/web/select-account.svg';
import { View, WebButton, WebImg } from '@components/atoms';
import { WebTitleWithDescription } from '@components/molecules';
import { DerivationPathValue, HDDerivationPathBox } from '@components/molecules/hd-derivation-path-box';
import { AccountInfo } from '@components/molecules/select-account-box';
import SelectAccountBox from '@components/molecules/select-account-box/select-account-box';
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
    submitSelectedAccounts,
  } = useAccountImportScreenReturn;

  const [showDerivationPath, setShowDerivationPath] = useState(false);
  const [derivationValue, setDerivationValue] = useState<DerivationPathValue | null>(null);

  // Addresses already registered in the wallet — used for the duplicate check.
  const { data: storedAddresses = [] } = useQuery<string[]>(
    ['accountImportStoredAddresses', storedAccounts],
    () => Promise.all(storedAccounts.map((account) => account.getAddress(chain.bech32Prefix))),
  );

  const derivationError = useMemo(() => {
    if (!derivationValue) {
      return null;
    }
    return storedAddresses.includes(derivationValue.address) ? 'Account already exists' : null;
  }, [derivationValue, storedAddresses]);

  const derivationAddress = derivationError ? null : derivationValue?.address ?? null;

  // Stable reference so the editor's derivation effect doesn't re-run every render.
  const deriveRef = useRef(deriveAddressByPath);
  deriveRef.current = deriveAddressByPath;
  const deriveAddress = useCallback(
    (account: number, change: number, addressIndex: number): Promise<string> =>
      deriveRef.current(account, change, addressIndex),
    [],
  );

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

  // Reflect the current selection: checkbox selections plus the derivation-path
  // account (which shows checked + locked when it appears in the list).
  const accountInfosWithSelection = useMemo(() => {
    return accountInfos.map((accountInfo) => {
      const locked = derivationAddress === accountInfo.address;
      return {
        ...accountInfo,
        locked,
        selected: locked || selectedAddresses.includes(accountInfo.address),
      };
    });
  }, [accountInfos, selectedAddresses, derivationAddress]);

  const isLoading = useMemo(() => {
    if (accountInfosWithSelection.length === 0) {
      return true;
    }

    return isLoadingAccounts;
  }, [isLoadingAccounts, accountInfosWithSelection]);

  const disabledButton = useMemo(() => {
    if (isLoading) {
      return true;
    }
    return selectedAddresses.length === 0 && derivationAddress === null;
  }, [isLoading, selectedAddresses.length, derivationAddress]);

  const onToggleDerivationPath = useCallback(() => {
    setDerivationValue(null);
    setShowDerivationPath((prev) => !prev);
  }, []);

  const onClickNext = useCallback(() => {
    submitSelectedAccounts(
      derivationAddress && derivationValue
        ? {
            account: derivationValue.account,
            change: derivationValue.change,
            addressIndex: derivationValue.addressIndex,
          }
        : null,
    );
  }, [submitSelectedAccounts, derivationAddress, derivationValue]);

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
        onToggleDerivationPath={onToggleDerivationPath}
        derivationActive={showDerivationPath}
      />
      {showDerivationPath && (
        <HDDerivationPathBox
          deriveAddress={deriveAddress}
          error={derivationError}
          onChange={setDerivationValue}
          onClose={onToggleDerivationPath}
        />
      )}
      <WebButton
        figure='primary'
        size='full'
        disabled={disabledButton}
        onClick={onClickNext}
        text='Next'
        rightIcon='chevronRight'
      />
    </StyledContainer>
  );
};

export default SelectAccountStep;
