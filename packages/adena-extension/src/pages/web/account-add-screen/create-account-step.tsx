import { ReactElement, useEffect } from 'react';
import styled from 'styled-components';

import AnimationLoadingAccount from '@assets/web/lottie/loading-accounts-success.json';

import { View } from '@components/atoms';
import { UseAccountAddScreenReturn } from '@hooks/web/use-account-add-screen';
import { WebTitleWithDescription } from '@components/molecules';
import Lottie from '@components/atoms/lottie';

const StyledContainer = styled(View)`
  width: 100%;
  row-gap: 24px;
  align-items: center;
`;

const CreateAccountStep = ({
  useAccountAddScreenReturn,
}: {
  useAccountAddScreenReturn: UseAccountAddScreenReturn;
}): ReactElement => {
  const { addAccount } = useAccountAddScreenReturn;

  useEffect(() => {
    addAccount();
  }, []);

  return (
    <StyledContainer>
      <View style={{ marginBottom: 16 }}>
        <Lottie animationData={AnimationLoadingAccount} height={120} />
      </View>
      <WebTitleWithDescription
        title='Loading Accounts'
        description='We’re loading accounts. This will take a few seconds...'
        isCenter
      />
    </StyledContainer>
  );
};

export default CreateAccountStep;
