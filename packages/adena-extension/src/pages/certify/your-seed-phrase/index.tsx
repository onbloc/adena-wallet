import React, { useCallback, useState } from 'react';
import styled, { CSSProp } from 'styled-components';
import TitleWithDesc from '@components/title-with-desc';
import SeedBox from '@components/seed-box';
import TermsCheckbox from '@components/terms-checkbox';
import Button, { ButtonHierarchy } from '@components/buttons/button';
import Text from '@components/text';
import { useLocation, useNavigate } from 'react-router-dom';
import { RoutePath } from '@router/path';
import { AdenaWallet, HDWalletKeyring, SeedAccount } from 'adena-module';
import SeedViewAndCopy from '@components/buttons/seed-view-and-copy';
import { useWalletContext } from '@hooks/use-context';
import { useCurrentAccount } from '@hooks/use-current-account';

const text = {
  title: 'Seed Phrase',
  desc: 'This phrase is the only way to recover this wallet. DO NOT share it with anyone.',
  termsA: 'This phrase will only be stored on this device. Adena can’t recover it for you.',
  termsB: 'I have saved my seed phrase.',
  blurScreenText: 'Make sure no one is watching your screen',
};

export const YourSeedPhrase = (): JSX.Element => {
  const navigate = useNavigate();
  const location = useLocation();
  const { wallet, updateWallet } = useWalletContext();
  const [terms, setTerms] = useState(false);
  const [seeds] = useState(() => AdenaWallet.generateMnemonic());
  const [viewSeedAgree, setViewSeedAgree] = useState(false);
  const [showBlurScreen, setShowBlurScreen] = useState(true);
  const [clicked, setClicked] = useState(false);
  const { changeCurrentAccount } = useCurrentAccount();

  const handleTermsChange = useCallback(() => setTerms((prev: boolean) => !prev), [terms]);

  const handleNextButtonClick = async (): Promise<void> => {
    if (clicked) {
      return;
    }
    setClicked(true);
    if (isAddAccount()) {
      addAccount();
      return;
    }

    setClicked(false);
    navigate(RoutePath.CreatePassword, {
      state: {
        type: 'SEED',
        seeds,
      },
    });
  };

  const isAddAccount = (): boolean => {
    return location?.state?.type === 'ADD_ACCOUNT';
  };

  const addAccount = async (): Promise<void> => {
    if (!wallet) {
      return;
    }
    const keyring = await HDWalletKeyring.fromMnemonic(seeds);
    const account = await SeedAccount.createBy(
      keyring,
      `Account ${wallet.lastAccountIndex + 1}`,
      0,
    );
    account.index = wallet.lastAccountIndex + 1;

    const clone = wallet.clone();
    clone.addAccount(account);
    clone.addKeyring(keyring);
    await updateWallet(clone);
    await changeCurrentAccount(account);
    navigate(RoutePath.Wallet);
  };

  const viewSeedAgreeButton = (): void => {
    if (terms) setViewSeedAgree(true);
    setShowBlurScreen(false);
    setTerms(false);
  };

  const getButtonText = useCallback(() => {
    if (!viewSeedAgree) {
      return 'Reveal Seed Phrase';
    }
    if (isAddAccount()) {
      return 'Create Account';
    }
    return 'Next';
  }, [viewSeedAgree, isAddAccount()]);

  return (
    <Wrapper>
      <TitleWithDesc title={text.title} desc={text.desc} isWarningDesc />
      <SeedBox
        seeds={seeds.split(' ')}
        scroll={false}
        hasBlurScreen={showBlurScreen}
        hasBlurText={!viewSeedAgree}
        blurScreenText={text.blurScreenText}
        className='seed-box'
      />
      {viewSeedAgree && (
        <SeedViewAndCopy
          showBlurScreen={showBlurScreen}
          setShowBlurScreen={setShowBlurScreen}
          copyStr={seeds}
          toggleText='Seed Phrase'
        />
      )}
      <TermsWrap>
        <TermsCheckbox
          checked={terms}
          onChange={handleTermsChange}
          tabIndex={1}
          id={viewSeedAgree ? 'terms-B' : 'terms-A'}
          text={viewSeedAgree ? text.termsB : text.termsA}
          checkboxPos={viewSeedAgree ? 'CENTER' : 'TOP'}
        />
        <Button
          fullWidth
          hierarchy={ButtonHierarchy.Primary}
          disabled={!terms}
          onClick={viewSeedAgree ? handleNextButtonClick : viewSeedAgreeButton}
          tabIndex={2}
        >
          <Text type='body1Bold'>{getButtonText()}</Text>
        </Button>
      </TermsWrap>
    </Wrapper>
  );
};

const Wrapper = styled.main`
  ${({ theme }): CSSProp => theme.mixins.flexbox('column', 'center', 'flex-start')};
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
  .terms-A {
    margin-bottom: 13px;
  }
`;
