import { arrayContentEquals } from 'adena-module';
import { useMemo } from 'react';
import styled from 'styled-components';

import IconSelectAccount from '@assets/web/select-account.svg';
import { View, WebButton, WebImg } from '@components/atoms';
import { WebTitleWithDescription } from '@components/molecules';
import { AccountInfo } from '@components/molecules/select-account-box';
import SelectAccountBox from '@components/molecules/select-account-box/select-account-box';
import { defaultAddressPrefix } from '@gnolang/tm2-js-client';
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
  const {
    isLoadingAccounts,
    loadedAccounts,
    storedAccounts,
    loadAccounts,
    selectAccount,
    selectedAddresses,
    onClickNext,
  } = useAccountImportScreenReturn;

  const { data: accountInfos = [] } = useQuery<AccountInfo[]>(
    ['accountImportSelectAccounts', loadedAccounts.length],
    async () => {
      const accountInfos: AccountInfo[] = [];
      for (const account of loadedAccounts) {
        const address = await account.getAddress(defaultAddressPrefix);
        const accountInfo: AccountInfo = {
          hdPath: account.index,
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
    return isLoading || selectedAddresses.length === 0;
  }, [isLoadingAccounts, selectedAddresses.length]);

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
      />
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
