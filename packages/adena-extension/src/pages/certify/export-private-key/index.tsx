import React, { useState } from 'react';
import styled, { CSSProp } from 'styled-components';
import { useNavigate } from 'react-router-dom';

import { Text, WarningBox } from '@components/atoms';

import ApproachPrivateKey from './ApproachPrivateKey';
import CheckPassword from './CheckPassword';

const StyledWrapper = styled.main`
  ${({ theme }): CSSProp => theme.mixins.flexbox('column', 'flex-start', 'flex-start')};
  width: 100%;
  height: 100%;
  padding-top: 24px;
  overflow-y: auto;
`;

export const ExportPrivateKey = (): JSX.Element => {
  const navigate = useNavigate();
  const backButtonClick = (): void => navigate(-1);

  const [isValidPwd, setIsValidPwd] = useState(false);

  return (
    <StyledWrapper>
      <Text type='header4'>Export Private Key</Text>
      <WarningBox
        type={isValidPwd ? 'approachPrivate' : 'approachPassword'}
        margin='12px 0px 20px'
      />
      {isValidPwd ? (
        <ApproachPrivateKey backButtonClick={backButtonClick} />
      ) : (
        <CheckPassword setIsValidPwd={setIsValidPwd} backButtonClick={backButtonClick} />
      )}
    </StyledWrapper>
  );
};
