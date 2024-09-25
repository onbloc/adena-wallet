import { ReactElement, useEffect, useState } from 'react';
import styled from 'styled-components';

import AnimationLoadingAccount from '@assets/web/lottie/loading-accounts.json';

import { View } from '@components/atoms';
import Lottie from '@components/atoms/lottie';
import { WebTitleWithDescription } from '@components/molecules';
import { UseAccountAddScreenReturn } from '@hooks/web/use-account-add-screen';

const StyledContainer = styled(View)`
  width: 100%;
  row-gap: 24px;
  align-items: center;
`;

const CreateAccountStep = ({
  selectedKeyringId,
  useAccountAddScreenReturn,
}: {
  selectedKeyringId?: string;
  useAccountAddScreenReturn: UseAccountAddScreenReturn;
}): ReactElement => {
  const { addAccount } = useAccountAddScreenReturn;
  const [executed, setExecuted] = useState(false);

  useEffect(() => {
    if (executed) {
      return;
    }
    setExecuted(true);
    addAccount(selectedKeyringId);
  }, [selectedKeyringId]);

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
