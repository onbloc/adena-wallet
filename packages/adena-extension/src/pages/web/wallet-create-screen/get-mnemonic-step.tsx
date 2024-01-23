import { ReactElement } from 'react';
import styled, { useTheme } from 'styled-components';

import IconWarning from '@assets/web/warning.svg';

import { Row, View, WebButton, WebImg, WebText } from '@components/atoms';
import { UseWalletCreateReturn } from '@hooks/web/use-wallet-create-screen';

const StyledContainer = styled(View)`
  row-gap: 24px;
`;

const StyledMessageBox = styled(View)`
  row-gap: 16px;
`;

const StyledWarnBox = styled(Row)`
  column-gap: 8px;
  padding: 8px;
  border-radius: 8px;
  background: rgba(251, 191, 36, 0.08);
`;

const GetMnemonicStep = ({
  useWalletCreateScreenReturn,
}: {
  useWalletCreateScreenReturn: UseWalletCreateReturn;
}): ReactElement => {
  const { onClickNext } = useWalletCreateScreenReturn;
  const theme = useTheme();

  return (
    <StyledContainer>
      <StyledMessageBox>
        <WebText type='headline3'>Seed Phrase</WebText>
        <StyledWarnBox>
          <WebImg src={IconWarning} size={20} />
          <WebText type='body6' color={theme.webWarning._100}>
            This phrase is the only way to recover this wallet. DO NOT share it with anyone.
          </WebText>
        </StyledWarnBox>
      </StyledMessageBox>
      <WebButton
        figure='primary'
        size='small'
        onClick={onClickNext}
        style={{ justifyContent: 'center' }}
      >
        <WebText type='title4'>Reveal Seed Phrase</WebText>
      </WebButton>
    </StyledContainer>
  );
};

export default GetMnemonicStep;
