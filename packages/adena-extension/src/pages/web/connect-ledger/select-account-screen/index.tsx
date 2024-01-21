import styled, { useTheme } from 'styled-components';

import rightSrc from '@assets/web/chevron-right.svg';

import { WebMain, View, WebText, WebButton, Row, WebCheckBox, WebImg } from '@components/atoms';
import { formatAddress } from '@common/utils/client-utils';
import IconArrowDown from '@assets/arrowS-down-gray.svg';
import useSelectAccountScreen from '@hooks/web/connect-ledger/use-select-account-screen';
import Header from './header';

const StyledMessageBox = styled(View)`
  row-gap: 16px;
`;

const StyledAccountBox = styled(View)`
  display: block;
  width: 416px;
  max-height: 266px;
  overflow-y: scroll;
`;

const StyledAccountItem = styled(Row)`
  height: 48px;
  justify-content: space-between;
  padding: 0 20px;
`;

const StyledLoadMore = styled(Row)<{ disabled: boolean }>`
  justify-content: center;
  padding: 8px 0;

  cursor: pointer;
  :disabled {
    cursor: not-allowed;
  }
`;

const ConnectLedgerSelectAccount = (): JSX.Element => {
  const {
    loadPath,
    accountInfos,
    selectAccountAddresses,
    onClickSelectButton,
    onClickLoadMore,
    onClickNextButton,
  } = useSelectAccountScreen();
  const theme = useTheme();

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
    <WebMain>
      <Header />
      <StyledMessageBox>
        <WebText type='headline3'>Select Accounts</WebText>
        <WebText type='body4' color={theme.webNeutral._500}>
          Select all accounts you wish to add to Adena.
        </WebText>
      </StyledMessageBox>
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
          {!loadPath && <WebImg src={IconArrowDown} />}
        </StyledLoadMore>
      </View>
      <WebButton
        figure='primary'
        size='small'
        disabled={loadPath || selectAccountAddresses.length === 0}
        onClick={onClickNextButton}
        style={{ width: '100%', alignItems: 'center' }}
      >
        <Row style={{ justifyContent: 'center' }}>
          <WebText type='title4'>Next</WebText>
          <WebImg src={rightSrc} size={24} />
        </Row>
      </WebButton>
    </WebMain>
  );
};

export default ConnectLedgerSelectAccount;
