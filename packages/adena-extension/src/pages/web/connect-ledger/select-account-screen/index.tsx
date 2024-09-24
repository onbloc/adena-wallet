import IconLedger from '@assets/web/ledger.svg';
import { View, WebButton, WebImg, WebMain } from '@components/atoms';
import { WebTitleWithDescription } from '@components/molecules';
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
  } = useSelectAccountScreen();
  const { navigate } = useAppNavigate();

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
      />
      <WebButton
        figure='primary'
        size='full'
        disabled={loadPath || selectAccountAddresses.length === 0}
        onClick={onClickNextButton}
        text='Next'
        rightIcon='chevronRight'
      />
    </WebMain>
  );
};

export default ConnectLedgerSelectAccount;
