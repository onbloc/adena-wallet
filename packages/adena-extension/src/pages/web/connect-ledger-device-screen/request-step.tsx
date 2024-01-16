import { ReactElement } from 'react';
import styled, { useTheme } from 'styled-components';

import { View, WebText } from '@components/atoms';
import { UseConnectLedgerDeviceScreenReturn } from '@hooks/web/use-connect-ledger-device-screen';

const StyledContainer = styled(View)`
  width: 100%;
  align-items: center;
`;

const RequestStep = ({
  useConnectLedgerDeviceScreenReturn,
}: {
  useConnectLedgerDeviceScreenReturn: UseConnectLedgerDeviceScreenReturn;
}): ReactElement => {
  const theme = useTheme();

  useConnectLedgerDeviceScreenReturn;

  return (
    <StyledContainer>
      <View style={{ rowGap: 16 }}>
        <WebText type='headline3'>Requesting Permission</WebText>
        <WebText type='body4' color={theme.webNeutral._500}>
          Approve the connection request in your browser.
        </WebText>
      </View>
    </StyledContainer>
  );
};

export default RequestStep;
