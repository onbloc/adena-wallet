import Button, { ButtonHierarchy } from '@components/buttons/button';
import { ErrorText } from '@components/error-text';
import TermsCheckbox from '@components/terms-checkbox';
import TitleWithDesc from '@components/title-with-desc';
import React, { useCallback, useState } from 'react';
import styled from 'styled-components';
import Text from '@components/text';
import SeedBox from '@components/seed-box';
import { WalletAccount } from 'adena-module';
import { RoutePath } from '@router/path';
import { useNavigate } from 'react-router-dom';
import { useImportAccount } from '@hooks/use-import-account';

const content = {
  title: 'Import Private Key',
  desc: 'Import an existing account\nwith a private key.',
  terms: 'Private key is only stored on this device, and Adena can’t recover it for you.',
};

export const ImportPrivateKey = () => {
  const navigate = useNavigate();
  const error = false;
  const [terms, setTerms] = useState(false);
  const [value, setValue] = useState('');
  const { importAccount } = useImportAccount();

  const handleTermsChange = useCallback(() => setTerms((prev: boolean) => !prev), [terms]);

  const onChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) => {
      setValue(e.target.value);
    },
    [value],
  );

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement | HTMLInputElement>) => {
    if (e.key === 'Enter' && terms && !error && value) {
      e.preventDefault();
      nextButtonClick();
    }
  };

  const nextButtonClick = async () => {
    const privateKey = value.replace('0x', '');
    const account = await WalletAccount.createByPrivateKeyHex(privateKey, 'g');
    importAccount(account);
    navigate(RoutePath.Wallet);
  };

  return (
    <Wrapper>
      <TitleWithDesc title={content.title} desc={content.desc} />
      <SeedBox
        value={value}
        onChange={onChange}
        onKeyDown={onKeyDown}
        error={error}
        scroll={true}
      />
      {error && <ErrorText text={''} />}
      <TermsWrap>
        <TermsCheckbox
          checked={terms}
          onChange={handleTermsChange}
          tabIndex={2}
          text={content.terms}
          checkboxPos='TOP'
        />
        <Button
          fullWidth
          hierarchy={ButtonHierarchy.Primary}
          disabled={false}
          onClick={nextButtonClick}
        >
          <Text type='body1Bold'>Next</Text>
        </Button>
      </TermsWrap>
    </Wrapper>
  );
};

const Wrapper = styled.main`
  ${({ theme }) => theme.mixins.flexbox('column', 'center', 'flex-start')};
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
