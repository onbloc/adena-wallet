import React from 'react';
import styled from 'styled-components';
import { useNavigate } from 'react-router-dom';

import lockLogo from '@assets/icon-lock.svg';
import { Text, Icon, Button } from '@components/atoms';
import theme from '@styles/theme';

import { RoutePath } from '@router/path';
import mixins from '@styles/mixins';

const text = {
  title: 'Forgot Password?',
  desc: 'Adena cannot recover your password for you. You can only reset your password with your seed phrase.',
};

export const ForgotPassword = (): JSX.Element => {
  const navigate = useNavigate();

  const onClickLearnMore = (): void => {
    try {
      const adenaDocsUrl =
        'https://docs.adena.app/resources/faq#i-got-locked-out-of-my-wallet-and-didnt-back-up-my-seed-phrase-is-there-a-way-to-recover-my-wallet';
      chrome.tabs.create({ url: adenaDocsUrl });
    } catch (e) {
      console.error(e);
    }
  };

  const onClickHaveNotSeedPhrase = (): void => {
    navigate(RoutePath.ResetWallet, { state: { backStep: -2, from: 'forgot-password' } });
  };

  const onClickForgotButton = (): void => {
    navigate(RoutePath.EnterSeedPhrase, {
      state: {
        from: 'forgot-password',
      },
    });
  };

  return (
    <Wrapper>
      <img src={lockLogo} alt='lock image' />
      <Text type='header4' margin='23px 0px 12px'>
        {text.title}
      </Text>
      <Text type='body1Reg' color={theme.color.neutral[9]} textAlign='center'>
        {text.desc}
      </Text>
      <LearnMore onClick={onClickLearnMore}>Learn more</LearnMore>
      <TextStyled onClick={onClickHaveNotSeedPhrase}>
        I don’t have my seed phrase
        <Icon name='iconArrowV2' />
      </TextStyled>
      <Button fullWidth onClick={onClickForgotButton}>
        <Text type='body1Bold'>Next</Text>
      </Button>
    </Wrapper>
  );
};

const Wrapper = styled.main`
  ${mixins.flex('column', 'center', 'flex-start')};
  width: 100%;
  height: 100%;
  padding-top: 50px;
  .seed-box {
    margin-top: 27px;
  }
`;

const LearnMore = styled.button`
  font-size: 16px;
  font-weight: 700;
  color: ${theme.color.primary[3]};
  margin-top: 24px;
  &:hover {
    text-decoration-line: underline;
    text-underline-offset: 2px;
    text-decoration-thickness: 1px;
    text-decoration-color: ${theme.color.primary[3]};
  }
`;

const TextStyled = styled.div`
  ${mixins.flex('row', 'center', 'center')};
  width: 100%;
  color: ${theme.color.neutral[9]};
  gap: 6px;
  font-size: 14px;
  font-weight: 500;
  line-height: 21px;
  transition: all 0.3s ease;
  margin: auto 0px 20px;
  cursor: pointer;
  transition: all 0.3s ease;
  svg * {
    transition: all 0.3s ease;
  }
  &:hover {
    color: ${theme.color.primary[3]};
    svg * {
      stroke: ${theme.color.primary[3]};
    }
  }
`;
