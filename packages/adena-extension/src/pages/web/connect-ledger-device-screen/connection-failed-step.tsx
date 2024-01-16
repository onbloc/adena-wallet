import { ReactElement } from 'react';
import styled, { useTheme } from 'styled-components';
import next from '@assets/web/chevron-right.svg';

import { Row, View, WebButton, WebText } from '@components/atoms';
import { UseConnectLedgerDeviceScreenReturn } from '@hooks/web/use-connect-ledger-device-screen';
import WebImg from '@components/atoms/web-img';

const StyledContainer = styled(View)`
  width: 100%;
  align-items: center;
  row-gap: 24px;
`;

const ConnectionFailedStep = ({
  useConnectLedgerDeviceScreenReturn,
}: {
  useConnectLedgerDeviceScreenReturn: UseConnectLedgerDeviceScreenReturn;
}): ReactElement => {
  const theme = useTheme();
  const { requestPermission } = useConnectLedgerDeviceScreenReturn;

  return (
    <StyledContainer>
      <View style={{ rowGap: 16 }}>
        <WebText type='headline3'>Connection Failed</WebText>
        <WebText type='body4' color={theme.webNeutral._500}>
          We couldn’t connect to your ledger device. Please ensure that your device is unlocked.
        </WebText>
      </View>

      <View style={{ alignItems: 'flex-start' }}>
        <WebButton
          figure='primary'
          size='small'
          onClick={(): void => {
            requestPermission();
          }}
        >
          <Row>
            <WebText type='title4'>Retry</WebText>
            <WebImg src={next} size={24} />
          </Row>
        </WebButton>
      </View>
    </StyledContainer>
  );
};

export default ConnectionFailedStep;
