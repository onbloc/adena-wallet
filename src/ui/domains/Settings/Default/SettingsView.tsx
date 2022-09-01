import React, { useEffect, useReducer, useRef, useState } from 'react';
import styled from 'styled-components';
import Typography from '@ui/common/Typography';
import pencil from '../../../../assets/pencil.svg';
import share from '../../../../assets/share.svg';
import arrowRight from '../../../../assets/arrowS-right.svg';
import FullButton from '@ui/common/Button/FullButton';
import { useNavigate } from 'react-router-dom';
import { RoutePath } from '@router/path';
import DefaultInput from '@ui/common/DefaultInput';
import { useSdk } from '@services/client';

const model = {
  walletName: 'Account 1',
  nickname: 'gno1...e558',
};

const Wrapper = styled.section`
  ${({ theme }) => theme.mixins.flexbox('column', 'center', 'flex-start')};
  width: 100%;
  height: 100%;
  padding: 30px 0px 0px;
`;

const IconInputBox = styled.div`
  width: 100%;
  position: relative;
`;

const Input = styled(DefaultInput)`
  padding-right: 38px;
`;

const PencilButton = styled.button`
  width: 24px;
  height: 24px;
  background: url(${pencil}) no-repeat center center;
  ${({ theme }) => theme.mixins.posTopCenterRight('11px')}
`;

const GnoLinkBox = styled.div`
  ${({ theme }) => theme.mixins.flexbox('row', 'center', 'space-between')};
  width: 100%;
  height: 40px;
  background-color: ${({ theme }) => theme.color.neutral[8]};
  border-radius: 24px;
  padding: 0px 16px;
  margin-top: 8px;
`;

const LinkIcon = styled.button`
  width: 24px;
  height: 24px;
  margin-left: 4px;
  background: url(${share}) no-repeat center center;
`;

const GrayButtonBox = styled.div`
  ${({ theme }) => theme.mixins.flexbox('column', 'flex-start', 'space-between')};
  width: 100%;
  height: 80px;
  background-color: ${({ theme }) => theme.color.neutral[6]};
  border-radius: 18px;
  padding: 12px 18px 14px 20px;
  margin: 20px 0px;
  cursor: pointer;
  & > .title-arrow {
    ${({ theme }) => theme.mixins.flexbox('row', 'center', 'space-between')};
    width: 100%;
    background: url(${arrowRight}) no-repeat center right;
  }
  transition: all 0.4s ease;
  &:hover {
    background-color: ${({ theme }) => theme.color.neutral[4]};
  }
`;

export const SettingsView = () => {
  const { address, addrname, addrnameChange } = useSdk();
  const navigate = useNavigate();
  const changePwdClick = () => navigate(RoutePath.SettingChangePassword);
  const exportKeyClick = () => navigate(RoutePath.SettingExportAccount);
  const revealSeedClick = () => navigate(RoutePath.SettingSeedPhrase);
  const [text, setText] = useState<string>(() => addrname[0] as string);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => setText(e.target.value);
  const shareButtonClick = () => window.open('https://gnoscan.io', '_blank');
  const handleTextBlur = () => setText(() => addrname[0] as string);
  const handleFocus = () => {
    setText('');
    inputRef.current?.focus();
  };

  useEffect(() => addrnameChange(text), [text]);

  return (
    <Wrapper>
      <IconInputBox>
        <Input
          type='text'
          value={text}
          onChange={handleTextChange}
          ref={inputRef}
          onBlur={handleTextBlur}
        />
        <PencilButton type='button' onClick={handleFocus} />
      </IconInputBox>
      <GnoLinkBox>
        <Typography type='captionReg'>{address}</Typography>
        <LinkIcon type='button' onClick={shareButtonClick} />
      </GnoLinkBox>
      <GrayButtonBox onClick={changePwdClick}>
        <Typography className='title-arrow' type='header6'>
          Change Password
        </Typography>
        <Typography type='body2Reg'>Change your lock screen password</Typography>
      </GrayButtonBox>
      <FullButton mode='primary' disabled={true}>
        <Typography type='body1Bold' disabled={true}>
          Export Private Key
        </Typography>
      </FullButton>
      <FullButton mode='primary' onClick={revealSeedClick} margin='12px 0px 0px'>
        <Typography type='body1Bold'>Reveal Seed Phrase</Typography>
      </FullButton>
    </Wrapper>
  );
};
