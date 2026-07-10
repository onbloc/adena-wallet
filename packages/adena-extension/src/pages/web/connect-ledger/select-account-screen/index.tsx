import { useCallback, useMemo, useRef, useState } from 'react';

import IconLedger from '@assets/web/ledger.svg';
import { View, WebButton, WebImg, WebMain } from '@components/atoms';
import { WebTitleWithDescription } from '@components/molecules';
import { DerivationPathValue, HDDerivationPathBox } from '@components/molecules/hd-derivation-path-box';
import { AccountInfo } from '@components/molecules/select-account-box';
import SelectAccountBox from '@components/molecules/select-account-box/select-account-box';
import { WebMainHeader } from '@components/pages/web/main-header';
import useAppNavigate from '@hooks/use-app-navigate';
import useSelectAccountScreen from '@hooks/web/connect-ledger/use-select-account-screen';
import { RoutePath } from '@types';

const ConnectLedgerSelectAccount = (): JSX.Element => {
  const {
    indicatorInfo,
    loadPath,
    accountInfos,
    selectAccountAddresses,
    onClickSelectButton,
    onClickLoadMore,
    deriveAddressByPath,
    submitSelectedAccounts,
    storedAddresses,
  } = useSelectAccountScreen();
  const { navigate } = useAppNavigate();

  const [showDerivationPath, setShowDerivationPath] = useState(false);
  const [derivationValue, setDerivationValue] = useState<DerivationPathValue | null>(null);

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

  const displayAccounts = useMemo<AccountInfo[]>(() => {
    return accountInfos.map((info) => {
      const locked = derivationAddress === info.address;
      return { ...info, locked, selected: locked || info.selected };
    });
  }, [accountInfos, derivationAddress]);

  const onToggleDerivationPath = useCallback(() => {
    setDerivationValue(null);
    setShowDerivationPath((prev) => !prev);
  }, []);

  const disabledNext = loadPath || (selectAccountAddresses.length === 0 && derivationAddress === null);

  const onClickNext = useCallback((): void => {
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
    <WebMain>
      <WebMainHeader
        stepLength={indicatorInfo.stepLength}
        onClickGoBack={(): void => {
          navigate(RoutePath.WebConnectLedger);
        }}
        currentStep={indicatorInfo.stepNo}
      />
      <View>
        <WebImg src={IconLedger} size={88} />
      </View>
      <WebTitleWithDescription
        title='Select Accounts'
        description='Select all accounts you wish to add to Adena.'
        marginTop={12}
        marginBottom={-6}
      />
      <SelectAccountBox
        accounts={displayAccounts}
        isLoading={loadPath}
        loadAccounts={onClickLoadMore}
        select={onClickSelectButton}
        onToggleDerivationPath={onToggleDerivationPath}
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
        disabled={disabledNext}
        onClick={onClickNext}
        text='Next'
        rightIcon='chevronRight'
      />
    </WebMain>
  );
};

export default ConnectLedgerSelectAccount;
