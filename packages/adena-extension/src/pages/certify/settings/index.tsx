import React, { useRef, useState } from 'react';
import styled from 'styled-components';
import Text from '@components/text';
import pencil from '../../../assets/pencil.svg';
import share from '../../../assets/share.svg';
import arrowRight from '../../../assets/arrowS-right.svg';
import Button, { ButtonHierarchy } from '@components/buttons/button';
import { useNavigate } from 'react-router-dom';
import { RoutePath } from '@router/path';
import DefaultInput from '@components/default-input';
import theme from '@styles/theme';
import { useCurrentAccount } from '@hooks/use-current-account';
import { useUpdateWalletAccountName } from '@hooks/use-update-wallet-account-name';
import { useGnoClient } from '@hooks/use-gno-client';

interface MenuMakerProps {
  onClick: () => void;
  title: string;
  subTitle: string;
}

const menuMakerInfo = [
  {
    title: 'Connected Apps',
    subTitle: 'Manage your app connections',
    navigatePath: RoutePath.ConnectedApps,
  },
  {
    title: 'Address Book',
    subTitle: 'Manage your saved addresses',
    navigatePath: RoutePath.AddressBook,
  },
  {
    title: 'Change Network',
    subTitle: 'Configure your network settings',
    navigatePath: RoutePath.ChangeNetwork,
  },
  {
    title: 'Change Password',
    subTitle: 'Change your lock screen password',
    navigatePath: RoutePath.SettingChangePassword,
  },
];

const MenuMaker = ({ onClick, title, subTitle }: MenuMakerProps) => (
  <GrayButtonBox onClick={onClick}>
    <Text className='title-arrow' type='body1Bold'>
      {title}
    </Text>
    <Text type='body2Reg' color={theme.color.neutral[2]}>
      {subTitle}
    </Text>
  </GrayButtonBox>
);

const ACCOUNT_NAME_LENGTH_LIMIT = 23;

export const Settings = () => {
  const [currnetAccount] = useCurrentAccount();
  const updateAccountName = useUpdateWalletAccountName();
  const navigate = useNavigate();
  const revealSeedClick = () => navigate(RoutePath.SettingSeedPhrase);
  const [text, setText] = useState<string>(() => currnetAccount?.data.name || '');
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [gnoClient] = useGnoClient();
  const shareButtonClick = async () => {
    window.open(`https://${gnoClient?.chainId ?? 'www'}.gnoscan.io/accounts/${currnetAccount?.data.address}`, '_blank')
  };

  const onChangeAccountName = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    if (name.length <= ACCOUNT_NAME_LENGTH_LIMIT) {
      await setText(name);
      await updateAccountName(currnetAccount?.data.address || '', name);
    }
  };

  const handleTextBlur = () => {
    const changedName = text === '' ? `Account ${currnetAccount?.data.index}` : text;
    updateAccountName(currnetAccount?.data.address || '', changedName);
  };

  const handleFocus = async () => {
    await setText('');
    await updateAccountName(currnetAccount?.data.address || '', '');
    inputRef.current?.focus();
  };

  return (
    <Wrapper>
      <IconInputBox>
        <Input
          type='text'
          value={text}
          onChange={onChangeAccountName}
          ref={inputRef}
          onBlur={handleTextBlur}
          placeholder={`Account ${currnetAccount?.data.index}`}
        />
        <PencilButton type='button' onClick={handleFocus} />
      </IconInputBox>
      <GnoLinkBox>
        <Text type='captionReg' className='link-text'>
          {currnetAccount?.data.address}
        </Text>
        <LinkIcon type='button' onClick={shareButtonClick} />
      </GnoLinkBox>
      {menuMakerInfo.map((v, i) => (
        <MenuMaker
          onClick={() => navigate(v.navigatePath)}
          title={v.title}
          subTitle={v.subTitle}
          key={i}
        />
      ))}
      <Button fullWidth hierarchy={ButtonHierarchy.Primary} disabled={true} margin='20px 0px 0px'>
        <Text type='body1Bold'>Export Private Key</Text>
      </Button>
      <Button
        fullWidth
        hierarchy={ButtonHierarchy.Primary}
        onClick={revealSeedClick}
        margin='12px 0px 0px'
      >
        <Text type='body1Bold'>Reveal Seed Phrase</Text>
      </Button>
    </Wrapper>
  );
};

const Wrapper = styled.main`
  ${({ theme }) => theme.mixins.flexbox('column', 'center', 'flex-start')};
  width: 100%;
  height: 100%;
  padding-top: 30px;
  padding-bottom: 80px;
  overflow-y: auto;
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
  padding: 0px 10px;
  margin: 8px 0px 20px;
  .link-text {
    max-width: 276px;
    overflow: hidden;
    white-space: nowrap;
  }
`;

const LinkIcon = styled.button`
  width: 20px;
  height: 20px;
  background: url(${share}) no-repeat center center;
`;

const GrayButtonBox = styled.div`
  ${({ theme }) => theme.mixins.flexbox('column', 'flex-start', 'space-between')};
  width: 100%;
  height: 80px;
  background-color: ${({ theme }) => theme.color.neutral[4]};
  border-radius: 18px;
  padding: 12px 18px 14px 20px;
  & + & {
    margin-top: 12px;
  }
  cursor: pointer;
  & > .title-arrow {
    ${({ theme }) => theme.mixins.flexbox('row', 'center', 'space-between')};
    width: 100%;
    background: url(${arrowRight}) no-repeat center right;
  }
  transition: all 0.4s ease;
  &:hover {
    background-color: ${({ theme }) => theme.color.neutral[5]};
  }
`;
