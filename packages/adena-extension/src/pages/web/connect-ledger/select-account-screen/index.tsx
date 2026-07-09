import { useCallback, useState } from 'react';

import IconLedger from '@assets/web/ledger.svg';
import { View, WebButton, WebImg, WebMain } from '@components/atoms';
import { WebTitleWithDescription } from '@components/molecules';
import { DerivationPathValue } from '@components/molecules/hd-derivation-path-box';
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
    onClickNextButton,
    deriveAddressByPath,
    addAccountByPath,
  } = useSelectAccountScreen();
  const { navigate } = useAppNavigate();

  const [derivationMode, setDerivationMode] = useState(false);
  const [derivationPath, setDerivationPath] = useState<DerivationPathValue | null>(null);

  const disabledNext = derivationMode
    ? derivationPath === null
    : loadPath || selectAccountAddresses.length === 0;

  const onClickNext = useCallback((): void => {
    if (derivationMode) {
      if (derivationPath) {
        addAccountByPath(derivationPath.account, derivationPath.change, derivationPath.addressIndex);
      }
      return;
    }
    onClickNextButton();
  }, [derivationMode, derivationPath, addAccountByPath, onClickNextButton]);

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
        accounts={accountInfos}
        isLoading={loadPath}
        loadAccounts={onClickLoadMore}
        select={onClickSelectButton}
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
        disabled={disabledNext}
        onClick={onClickNext}
        text='Next'
        rightIcon='chevronRight'
      />
    </WebMain>
  );
};

export default ConnectLedgerSelectAccount;
