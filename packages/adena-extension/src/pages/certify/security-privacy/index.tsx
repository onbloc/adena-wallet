import React, { useCallback, useEffect, useState } from 'react';
import styled from 'styled-components';
import { useNavigate } from 'react-router-dom';
import { Account, isLedgerAccount, isSeedAccount } from 'adena-module';

import { Text, FullButtonRightIcon, ButtonMode } from '@components/atoms';
import { BottomFixedButton } from '@components/molecules';
import { RoutePath } from '@router/path';
import { useCurrentAccount } from '@hooks/use-current-account';
import { useRemoveAccount } from '@hooks/use-remove-account';
import mixins from '@styles/mixins';

const getMenuMakerInfo = (
  account: Account | null,
  availRemove: boolean,
): { title: string; navigatePath: RoutePath; mode: string; disabled: boolean }[] => [
  {
    title: 'Change Password',
    navigatePath: RoutePath.SettingChangePassword,
    mode: 'DEFAULT',
    disabled: false,
  },
  {
    title: 'Reveal Seed Phrase',
    navigatePath: RoutePath.RevealPasswordPhrase,
    mode: 'DEFAULT',
    disabled: !account || !isSeedAccount(account),
  },
  {
    title: 'Export Private Key',
    navigatePath: RoutePath.ExportPrivateKey,
    mode: 'DEFAULT',
    disabled: !account || isLedgerAccount(account),
  },
  {
    title: 'Remove Account',
    navigatePath: RoutePath.RemoveAccount,
    mode: 'DANGER',
    disabled: !availRemove,
  },
  {
    title: 'Reset Wallet',
    navigatePath: RoutePath.ResetWallet,
    mode: 'DANGER',
    disabled: false,
  },
];

export const SecurityPrivacy = (): JSX.Element => {
  const navigate = useNavigate();
  const { currentAccount } = useCurrentAccount();
  const { availRemoveAccount } = useRemoveAccount();
  const [availRemove, setAvailRemove] = useState(true);

  useEffect(() => {
    availRemoveAccount().then(setAvailRemove);
  }, []);

  const moveBack = useCallback(() => {
    navigate(-1);
  }, [navigate]);

  return (
    <Wrapper>
      <Text type='header4' margin='0px 0px 12px 0px'>
        Security & Privacy
      </Text>
      {getMenuMakerInfo(currentAccount, availRemove).map((v, i) => (
        <FullButtonRightIcon
          key={i}
          title={v.title}
          onClick={(): void => navigate(v.navigatePath)}
          mode={v.mode as ButtonMode}
          disabled={v.disabled as boolean}
        />
      ))}
      <BottomFixedButton onClick={moveBack} />
    </Wrapper>
  );
};

const Wrapper = styled.main`
  ${mixins.flex({ align: 'flex-start', justify: 'flex-start' })};
  width: 100%;
  height: 100%;
  padding-top: 24px;
  padding-bottom: 103px;
  overflow-y: auto;
`;
