import { ReactElement, useEffect } from 'react';
import styled, { useTheme } from 'styled-components';

import AnimationLoadingAccount from '@assets/web/loading-account-idle.gif';

import { View, WebImg, WebText } from '@components/atoms';
import { UseAccountAddScreenReturn } from '@hooks/web/use-account-add-screen';

const StyledContainer = styled(View)`
  width: 100%;
  row-gap: 24px;
  align-items: center;
`;

const StyledMessageBox = styled(View)`
  row-gap: 16px;
`;

const CreateAccountStep = ({
  useAccountAddScreenReturn,
}: {
  useAccountAddScreenReturn: UseAccountAddScreenReturn;
}): ReactElement => {
  const { addAccount } = useAccountAddScreenReturn;
  const theme = useTheme();

  useEffect(() => {
    addAccount();
  }, []);

  return (
    <StyledContainer>
      <WebImg src={AnimationLoadingAccount} height={120} />
      <StyledMessageBox>
        <WebText type='headline2' textCenter>
          Loading Accounts
        </WebText>
        <WebText type='body6' color={theme.webNeutral._500} textCenter>
          We’re loading accounts. This will take a few seconds...
        </WebText>
      </StyledMessageBox>
    </StyledContainer>
  );
};

export default CreateAccountStep;
