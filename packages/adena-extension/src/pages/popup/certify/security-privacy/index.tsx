import React, { useCallback, useEffect, useState } from 'react';
import styled from 'styled-components';
import { Account, hasPrivateKeyAccount, isSeedAccount } from 'adena-module';

import { Text, FullButtonRightIcon, ButtonMode } from '@components/atoms';
import { BottomFixedButton } from '@components/molecules';
import { RoutePath } from '@types';
import { useCurrentAccount } from '@hooks/use-current-account';
import { useRemoveAccount } from '@hooks/use-remove-account';
import mixins from '@styles/mixins';
import useAppNavigate from '@hooks/use-app-navigate';
import useLink from '@hooks/use-link';
import { AdenaStorage } from '@common/storage';
import { WALLET_EXPORT_TYPE_STORAGE_KEY } from '@common/constants/storage.constant';

const getMenuMakerInfo = (
  account: Account | null,
  availRemove: boolean,
): {
  title: string;
  navigatePath:
  | RoutePath.SettingChangePassword
  | RoutePath.RevealPasswordPhrase
  | RoutePath.ExportPrivateKey
  | RoutePath.RemoveAccount
  | RoutePath.ResetWallet;
  mode: string;
  disabled: boolean;
}[] => [
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
      disabled: !account || !hasPrivateKeyAccount(account),
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
  const { navigate, goBack } = useAppNavigate();
  const { openLink } = useLink();
  const { currentAccount } = useCurrentAccount();
  const { availRemoveAccount } = useRemoveAccount();
  const [availRemove, setAvailRemove] = useState(true);

  const onClickMenuItem = useCallback((navigatePath:
    RoutePath.SettingChangePassword
    | RoutePath.RevealPasswordPhrase
    | RoutePath.ExportPrivateKey
    | RoutePath.RemoveAccount
    | RoutePath.ResetWallet,
  ) => {
    if (
      navigatePath === RoutePath.RevealPasswordPhrase ||
      navigatePath === RoutePath.ExportPrivateKey
    ) {
      const exportType = navigatePath ===
        RoutePath.RevealPasswordPhrase ?
        'SEED_PHRASE' :
        'PRIVATE_KEY';
      AdenaStorage.session().set(WALLET_EXPORT_TYPE_STORAGE_KEY, exportType).then(() => {
        openLink('/register.html#' + RoutePath.WebWalletExport);
      });
      return;
    }
    navigate(navigatePath);
  }, [navigate])

  useEffect(() => {
    availRemoveAccount().then(setAvailRemove);
  }, []);

  return (
    <Wrapper>
      <Text type='header4' margin='0px 0px 12px 0px'>
        Security & Privacy
      </Text>
      {getMenuMakerInfo(currentAccount, availRemove).map((v, i) => (
        <FullButtonRightIcon
          key={i}
          title={v.title}
          onClick={(): void => onClickMenuItem(v.navigatePath)}
          mode={v.mode as ButtonMode}
          disabled={v.disabled as boolean}
        />
      ))}
      <BottomFixedButton onClick={goBack} />
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
