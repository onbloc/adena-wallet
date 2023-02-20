import Copy from '@components/buttons/copy-button';
import Button, { ButtonHierarchy } from '@components/buttons/button';
import TitleWithDesc from '@components/title-with-desc';
import Text from '@components/text';
import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import { RoutePath } from '@router/path';
import { useLocation, useNavigate } from 'react-router-dom';

const text = {
  title: 'Export Private Key',
  desc: 'Do not share your private key!\nAnyone with your private key will have\nfull control of your wallet.',
  key: 'a12093890asjfnlkf02394klajsdfklasnflkauv09askdlfjkdsfanlk34u09usafdfdasdfsdfa1211321213',
};

const Wrapper = styled.main`
  ${({ theme }) => theme.mixins.flexbox('column', 'center', 'flex-start')};
  width: 100%;
  height: 100%;
  padding-top: 24px;
  .error {
    width: 100%;
    padding-left: 16px;
  }
`;

const CopyKeyBox = styled.div`
  ${({ theme }) => theme.mixins.flexbox('column', 'center', 'stretch')};
  width: 100%;
  margin-top: 24px;
  margin-bottom: auto;
`;

const KeyBox = styled.div`
  ${({ theme }) => theme.mixins.flexbox('column', 'stretch', 'center')};
  background-color: ${({ theme }) => theme.color.neutral[8]};
  border: 1px solid ${({ theme }) => theme.color.neutral[3]};
  border-radius: 18px;
  width: 100%;
  height: 140px;
  padding: 14px 16px;
  margin-bottom: 12px;
  word-wrap: break-word;
  & > p {
    ${({ theme }) => theme.fonts.body2Reg};
    text-align: center;
    color: ${({ theme }) => theme.color.neutral[2]};
  }
`;

export const ViewPrivateKey = () => {
  const navigate = useNavigate();
  const doneButtonClick = () => navigate(-1);
  const location = useLocation();
  const [privkey, setPrivkey] = useState('');

  useEffect(() => {
    const state = location.state as string;
    setPrivkey(state);
  }, []);

  return (
    <Wrapper>
      <TitleWithDesc title={text.title} desc={text.desc} />
      <CopyKeyBox>
        <KeyBox>
          <p>{privkey && privkey}</p>
        </KeyBox>
        <Copy copyStr={privkey} />
      </CopyKeyBox>
      <Button fullWidth hierarchy={ButtonHierarchy.Primary} onClick={doneButtonClick}>
        <Text type='body1Bold'>Done</Text>
      </Button>
    </Wrapper>
  );
};
