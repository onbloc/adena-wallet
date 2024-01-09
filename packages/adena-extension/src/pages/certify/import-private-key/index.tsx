import React, { useCallback, useState } from 'react';
import styled from 'styled-components';
import { SingleAccount, PrivateKeyKeyring } from 'adena-module';

import { Text, ErrorText, Button, SecureTextarea } from '@components/atoms';
import { TitleWithDesc, TermsCheckbox } from '@components/molecules';
import { RoutePath } from '@router/path';
import { useImportAccount } from '@hooks/use-import-account';
import { useWalletContext } from '@hooks/use-context';
import mixins from '@styles/mixins';
import useAppNavigate from '@hooks/use-app-navigate';

const content = {
  title: 'Import Private Key',
  desc: 'Import an existing account\nwith a private key.',
  terms: 'This key will only be stored on this device. Adena can’t recover it for you.',
};

export const ImportPrivateKey = (): JSX.Element => {
  const { navigate } = useAppNavigate();
  const { wallet } = useWalletContext();
  const [terms, setTerms] = useState(false);
  const [value, setValue] = useState('');
  const { importAccount } = useImportAccount();
  const [errorMessage, setErrorMessage] = useState('');
  const [enabled, setEnabled] = useState(true);

  const handleTermsChange = useCallback(() => setTerms((prev: boolean) => !prev), [terms]);

  const error = errorMessage !== '';
  const isImportButton = terms && value.length > 0;

  const onChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) => {
      setValue(e.target.value);
      setErrorMessage('');
    },
    [value],
  );

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement | HTMLInputElement>): void => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (terms && !error && value !== '') {
        nextButtonClick();
      } else return;
    }
  };

  const nextButtonClick = async (): Promise<void> => {
    if (!enabled) {
      return;
    }
    setEnabled(false);
    try {
      const privateKey = value.replace('0x', '');
      const regExp = /[0-9A-Fa-f]{64}/g;
      if (privateKey.length !== 64 || !privateKey.match(regExp)) {
        throw new Error('Invalid private key');
      }
      if (!wallet) {
        setEnabled(true);
        return;
      }
      const keyring = await PrivateKeyKeyring.fromPrivateKeyStr(privateKey);
      const account = await SingleAccount.createBy(keyring, wallet.nextAccountName);
      const publicKey = account.publicKey;
      const storedAccount = wallet.accounts.find(
        (account) => JSON.stringify(account.publicKey) === JSON.stringify(publicKey),
      );
      if (storedAccount) {
        throw new Error('Private key already registered');
      }

      await importAccount(account, keyring);
      navigate(RoutePath.Wallet);
    } catch (e) {
      if (e instanceof Error) {
        setErrorMessage(e.message);
      }
    }
    setEnabled(true);
  };

  return (
    <Wrapper onKeyDown={onKeyDown}>
      <TitleWithDesc title={content.title} desc={content.desc} />
      <SecureTextarea value={value} onChange={onChange} onKeyDown={onKeyDown} error={error} />
      {error && <ErrorText text={errorMessage} />}
      <TermsWrap>
        <TermsCheckbox
          checked={terms}
          onChange={handleTermsChange}
          tabIndex={2}
          text={content.terms}
          checkboxPos='TOP'
        />
        <Button fullWidth disabled={!isImportButton} onClick={nextButtonClick}>
          <Text type='body1Bold'>Import</Text>
        </Button>
      </TermsWrap>
    </Wrapper>
  );
};

const Wrapper = styled.main`
  ${mixins.flex({ justify: 'flex-start' })};
  width: 100%;
  height: 100%;
  padding-top: 50px;
  .seed-box {
    margin-top: 27px;
  }
`;

const TermsWrap = styled.div`
  margin-top: auto;
  width: 100%;
  /* .terms-A {
    margin-bottom: 9px;
  } */
`;
