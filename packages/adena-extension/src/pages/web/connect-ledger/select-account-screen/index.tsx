import styled, { keyframes, useTheme } from 'styled-components';

import { WebMain, View, WebText, WebButton, Row, WebCheckBox, WebImg } from '@components/atoms';
import { formatAddress } from '@common/utils/client-utils';
import IconArrowDown from '@assets/arrowS-down-gray.svg';
import IconLoadingCircle from '@assets/web/loading-circle.svg';
import useSelectAccountScreen from '@hooks/web/connect-ledger/use-select-account-screen';
import { WebMainHeader } from '@components/pages/web/main-header';
import useAppNavigate from '@hooks/use-app-navigate';
import { RoutePath } from '@types';
import { WebTitleWithDescription } from '@components/molecules';
import IconLedger from '@assets/web/ledger.svg';

const StyledAccountBox = styled(View)`
  display: block;
  width: 552px;
  max-height: 266px;
  overflow-y: auto;
  background-color: #14161a;
  border-radius: 12px;

  ::-webkit-scrollbar {
    display: none; /* Chrome, Safari, Opera*/
  }
`;

const StyledAccountItem = styled(Row)`
  height: 48px;
  justify-content: space-between;
  padding: 0 20px;
  border-bottom: 1px solid #1F2329;
  :last-child {
    border-bottom: 1px solid #14161a;
  }
`;

const StyledLoadMore = styled(Row) <{ disabled: boolean }>`
  justify-content: center;
  padding: 8px 0;
  gap: 4px;

  cursor: pointer;
  :disabled {
    cursor: not-allowed;
  }
`;

const KeyframeRotate = keyframes`
  from {
    -webkit-transform: rotate(0deg);
    -o-transform: rotate(0deg);
    transform: rotate(0deg);
  }
  to {
    -webkit-transform: rotate(360deg);
    -o-transform: rotate(360deg);
    transform: rotate(360deg);
  }
`;

const StyledLoadingWrapper = styled(View)`
  justify-content: center;
  align-items:center;
  animation: ${KeyframeRotate} 1.5s infinite;
`;

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
  const theme = useTheme();
  const { navigate } = useAppNavigate();

  const renderAccountInfo = (accountInfo: {
    index: number;
    address: string;
    hdPath: number;
    stored: boolean;
    selected: boolean;
  }): JSX.Element => {
    const { index, address, hdPath, stored, selected } = accountInfo;
    return (
      <StyledAccountItem key={index}>
        <Row style={{ columnGap: 8 }}>
          <WebText type='body5'>{formatAddress(address)}</WebText>
          <WebText
            type='body5'
            color={theme.webNeutral._700}
          >{`m/44'/118'/0'/0/${hdPath}`}</WebText>
        </Row>
        {stored ? (
          <WebCheckBox checked disabled />
        ) : (
          <WebCheckBox checked={selected} onClick={(): void => onClickSelectButton(address)} />
        )}
      </StyledAccountItem>
    );
  };

  return (
    <WebMain spacing={272}>
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
      <View>
        <StyledAccountBox>
          {accountInfos.length > 0 ? (
            accountInfos.map(renderAccountInfo)
          ) : (
            <WebText type='body4'>No data to display</WebText>
          )}
        </StyledAccountBox>
        <StyledLoadMore onClick={loadPath ? undefined : onClickLoadMore} disabled={loadPath}>
          <WebText color={theme.webNeutral._500} type='body5'>
            {loadPath ? 'Loading' : 'Load more accounts'}
          </WebText>
          {!loadPath ?
            <WebImg src={IconArrowDown} /> :
            <StyledLoadingWrapper>
              <WebImg src={IconLoadingCircle} />
            </StyledLoadingWrapper>
          }
        </StyledLoadMore>
      </View>
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
