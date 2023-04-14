import React from 'react';
import styled from 'styled-components';
import Button, { ButtonHierarchy } from '@components/buttons/button';
import TitleWithDesc from '@components/title-with-desc';
import Text from '@components/text';
import IconSuccessSymbol from '@assets/success-symbol.svg';
import { useLocation } from 'react-router-dom';
import { useAdenaContext } from '@hooks/use-context';
import { deserializeAccount } from 'adena-module';

const text = {
  title: 'Account Added',
  desc: 'You have successfully added your\nledger device account to Adena!\nPlease return to your extension to continue.',
};

const Wrapper = styled.main`
  ${({ theme }) => theme.mixins.flexbox('column', 'center', 'flex-start')};
  width: 100%;
  height: 100%;
  padding: 24px 20px;
  margin: 0 auto;

  .icon {
    width: 100px;
    height: 100px;
    margin: 20px auto;
  }

  div {
    text-align: center;
  }
`;

export const ApproveConnectHardwareWalletFinish = () => {
  const { accountService } = useAdenaContext();
  const location = useLocation();

  const onClickDoneButton = async () => {
    const { accounts, currentAccount } = location.state;
    const deseriazedAccounts = accounts.map(deserializeAccount);
    await accountService.updateAccounts(deseriazedAccounts);
    if (currentAccount) {
      await accountService.changeCurrentAccount(deserializeAccount(currentAccount));
    }
    window.close();
  };

  return (
    <Wrapper>
      <img className='icon' src={IconSuccessSymbol} alt='logo-image' />
      <TitleWithDesc title={text.title} desc={text.desc} />
      <Button
        fullWidth
        hierarchy={ButtonHierarchy.Primary}
        margin='auto 0px 0px'
        onClick={onClickDoneButton}
      >
        <Text type='body1Bold'>Done</Text>
      </Button>
    </Wrapper>
  );
};
