import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styled, { CSSProp, FlattenSimpleInterpolation } from 'styled-components';

import { Text, Button, ButtonHierarchy, Copy } from '@components/atoms';
import { TitleWithDesc } from '@components/molecules';
import { useCurrentAccount } from '@hooks/use-current-account';
import { useAdenaContext } from '@hooks/use-context';

const text = {
  title: 'Export Private Key',
  desc: 'Do not share your private key!\nAnyone with your private key will have\nfull control of your wallet.',
  key: 'a12093890asjfnlkf02394klajsdfklasnflkauv09askdlfjkdsfanlk34u09usafdfdasdfsdfa1211321213',
};

const Wrapper = styled.main`
  ${({ theme }): CSSProp => theme.mixins.flexbox('column', 'center', 'flex-start')};
  width: 100%;
  height: 100%;
  padding-top: 24px;
  .error {
    width: 100%;
    padding-left: 16px;
  }
`;

const CopyKeyBox = styled.div`
  ${({ theme }): CSSProp => theme.mixins.flexbox('column', 'center', 'stretch')};
  width: 100%;
  margin-top: 24px;
  margin-bottom: auto;
`;

const KeyBox = styled.div`
  ${({ theme }): CSSProp => theme.mixins.flexbox('column', 'stretch', 'center')};
  background-color: ${({ theme }): string => theme.color.neutral[8]};
  border: 1px solid ${({ theme }): string => theme.color.neutral[3]};
  border-radius: 18px;
  width: 100%;
  height: 140px;
  padding: 14px 16px;
  margin-bottom: 12px;
  word-wrap: break-word;
  & > p {
    ${({ theme }): FlattenSimpleInterpolation => theme.fonts.body2Reg};
    text-align: center;
    color: ${({ theme }): string => theme.color.neutral[2]};
  }
`;

export const ViewPrivateKey = (): JSX.Element => {
  const { currentAccount } = useCurrentAccount();
  const { walletService } = useAdenaContext();
  const navigate = useNavigate();
  const doneButtonClick = (): void => navigate(-1);
  const [privateKey, setPrivateKey] = useState('');

  useEffect(() => {
    initPrivateKey();
  }, [currentAccount]);

  const initPrivateKey = async (): Promise<void> => {
    const wallet = await walletService.loadWallet();
    const privateKey = wallet.privateKeyStr;
    if (privateKey) {
      setPrivateKey(privateKey);
    }
  };

  return (
    <Wrapper>
      <TitleWithDesc title={text.title} desc={text.desc} />
      <CopyKeyBox>
        <KeyBox>
          <p>{privateKey && privateKey}</p>
        </KeyBox>
        <Copy copyStr={privateKey} />
      </CopyKeyBox>
      <Button fullWidth hierarchy={ButtonHierarchy.Primary} onClick={doneButtonClick}>
        <Text type='body1Bold'>Done</Text>
      </Button>
    </Wrapper>
  );
};
