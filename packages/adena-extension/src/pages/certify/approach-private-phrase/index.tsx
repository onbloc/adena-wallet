import React, { useState } from 'react';
import styled from 'styled-components';
import Text from '@components/text';
import WarningBox from '@components/warning/warning-box';
import SeedBox from '@components/seed-box';
import Button, { ButtonHierarchy } from '@components/buttons/button';
import SeedViewAndCopy from '@components/buttons/seed-view-and-copy';

const privateKey =
  'a12093890asjfnlkf02394klajsdfklasnflkauv09askdlfjkdsfanlk34u09usafdfdasdfsdfa1211321213';

export const ApproachPrivatePhrase = () => {
  const [showBlurScreen, setShowBlurScreen] = useState(true);
  const doneButtonClick = () => {
    // TODO
  };

  return (
    <Wrapper>
      <Text type='header4'>Export Private Key</Text>
      <WarningBox type='approachPrivate' margin='12px 0px 20px' padding='14px 16px' />
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
