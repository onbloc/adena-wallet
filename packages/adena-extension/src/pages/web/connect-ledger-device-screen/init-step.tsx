import { ReactElement } from 'react';
import styled, { useTheme } from 'styled-components';
import next from '@assets/web/chevron-right.svg';

import { Row, View, WebButton, WebText } from '@components/atoms';
import WebImg from '@components/atoms/web-img';
import { UseConnectLedgerDeviceScreenReturn } from '@hooks/web/use-connect-ledger-device-screen';

const StyledContainer = styled(View)`
  row-gap: 24px;
`;

const InitStep = ({
  useConnectLedgerDeviceScreenReturn,
}: {
  useConnectLedgerDeviceScreenReturn: UseConnectLedgerDeviceScreenReturn;
}): ReactElement => {
  const { requestPermission } = useConnectLedgerDeviceScreenReturn;
  const theme = useTheme();

  return (
    <StyledContainer>
      <View style={{ rowGap: 16 }}>
        <WebText type='headline3'>Connect a Ledger Device</WebText>
        <WebText type='body4' color={theme.webNeutral._500}>
          Connect your ledger device to your computer and make sure it is unlocked.
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
            <WebText type='title4'>Connect</WebText>
            <WebImg src={next} size={24} />
          </Row>
        </WebButton>
      </View>
    </StyledContainer>
  );
};

export default InitStep;
