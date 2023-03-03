import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import Text from '@components/text';
import WarningBox from '@components/warning/warning-box';
import SeedBox from '@components/seed-box';
import Button, { ButtonHierarchy } from '@components/buttons/button';
import SeedViewAndCopy from '@components/buttons/seed-view-and-copy';
import { useCurrentAccount } from '@hooks/use-current-account';
import { useNavigate } from 'react-router-dom';
import { RoutePath } from '@router/path';

export const ApproachPrivatePhrase = () => {
  const navigate = useNavigate();
  const [currentAccount] = useCurrentAccount();
  const [showBlurScreen, setShowBlurScreen] = useState(true);
  const [privateKey, setPrivateKey] = useState('');

  useEffect(() => {
    const privateKey = currentAccount?.getPrivateKey();
    if (privateKey) {
      setPrivateKey('0x' + privateKey);
    }
  }, [currentAccount]);

  const doneButtonClick = () => {
    navigate(-2);
  };

  return (
    <Wrapper>
      <Text type='header4'>Export Private Key</Text>
      <WarningBox type='approachPrivate' margin='12px 0px 20px' />
      <SeedBox
        seeds={privateKey}
        scroll={false}
        hasBlurScreen={showBlurScreen}
        className='private-key-style'
      />
      <SeedViewAndCopy
        showBlurScreen={showBlurScreen}
        setShowBlurScreen={setShowBlurScreen}
        copyStr={privateKey}
        toggleText='Private Key'
      />
      <Button fullWidth hierarchy={ButtonHierarchy.Primary} onClick={doneButtonClick}>
        <Text type='body1Bold'>Done</Text>
      </Button>
    </Wrapper>
  );
};

const Wrapper = styled.main`
  ${({ theme }) => theme.mixins.flexbox('column', 'flex-start', 'flex-start')};
  width: 100%;
  height: 100%;
  padding-top: 24px;
  overflow-y: auto;
  .private-key-style {
    ${({ theme }) => theme.mixins.flexbox('row', 'center', 'center')};
    .seed-text {
      word-break: break-all;
      text-align: center;
    }
  }
`;
