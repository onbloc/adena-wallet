import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import Button, { ButtonHierarchy } from '@components/buttons/button';
import TitleWithDesc from '@components/title-with-desc';
import Text from '@components/text';
import { useLocation, useNavigate } from 'react-router-dom';
import { WalletAccount } from 'adena-module';
import IconAddSymbol from '@assets/add-symbol.svg';
import IconCheck from '@assets/check.svg';
import theme from '@styles/theme';
import { formatAddress } from '@common/utils/client-utils';
import { WalletService } from '@services/index';
import { RoutePath } from '@router/path';

const text = {
  title: 'Select Accounts'
};

const Wrapper = styled.main`
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  padding-top: 40px;

  .title {
    display: flex;
    flex-direction: column;
    width: 100%;
  }

  .title > div {
    text-align: center;
    margin: 10px auto;
    justify-content: center;
    align-items: center;
  }

  .icon {
    width: 100px;
    height: 100px;
    margin: 10px auto;
  }
`;

const AccountListContainer = styled.div`
  display: flex;
  flex-direction: column;
  width: 320px;
  height: 166px;
  border: 1px solid ${theme.color.neutral[6]};
  border-radius: 10px;
  overflow: auto;

  .item {
    display: flex;
    flex-direction: row;
    width: 100%;
    height: 46px;
    padding: 10px 20px;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid ${theme.color.neutral[6]};
    background-color: ${theme.color.neutral[8]};

    .address {
      margin-right: 10px;
    }

    .path {
      color: ${theme.color.neutral[9]};
    }

    .check {
      display: inline-flex;
      width: 20px;
      height: 20px;
      border: 1px solid ${theme.color.neutral[4]};
      border-radius: 4px;
      cursor: pointer;

      img {
        display: none;
      }

      &.active {
        background-color: ${theme.color.primary[4]};
        border: 1px solid ${theme.color.primary[4]};

        img {
          display: block;
        }
      }
    }
  }

  .item:last-child{
    border-bottom: none;
  }
`;

const defaultAccounts = [
  "{\"index\":1,\"signerType\":\"LEDGER\",\"name\":\"Account 1\",\"status\":\"ACTIVE\",\"address\":\"g19fs7tzl2r4hpvpvxt9tvv54gpy6fekt8shzp4q\",\"balance\":\"\",\"histories\":[],\"config\":{\"chainId\":\"test2\",\"coinDenom\":\"UGNOT\",\"coinMinimalDenom\":\"ugnot\",\"coinDecimals\":6}}",
  "{\"index\":2,\"signerType\":\"LEDGER\",\"name\":\"Account 2\",\"status\":\"ACTIVE\",\"address\":\"g1ckddn039khwxzu4v5mc8n34vd9ksaks2l6c3kg\",\"balance\":\"\",\"histories\":[],\"config\":{\"chainId\":\"test2\",\"coinDenom\":\"UGNOT\",\"coinMinimalDenom\":\"ugnot\",\"coinDecimals\":6}}",
  "{\"index\":3,\"signerType\":\"LEDGER\",\"name\":\"Account 3\",\"status\":\"ACTIVE\",\"address\":\"g1q3j7d85k8x4hxw8f0w7z66hnkh4em6l6c03t5r\",\"balance\":\"\",\"histories\":[],\"config\":{\"chainId\":\"test2\",\"coinDenom\":\"UGNOT\",\"coinMinimalDenom\":\"ugnot\",\"coinDecimals\":6}}",
  "{\"index\":4,\"signerType\":\"LEDGER\",\"name\":\"Account 4\",\"status\":\"ACTIVE\",\"address\":\"g1drg7fj2jmp6jtqhrvrcwy7ch23upn52y0q8ch6\",\"balance\":\"\",\"histories\":[],\"config\":{\"chainId\":\"test2\",\"coinDenom\":\"UGNOT\",\"coinMinimalDenom\":\"ugnot\",\"coinDecimals\":6}}",
  "{\"index\":5,\"signerType\":\"LEDGER\",\"name\":\"Account 5\",\"status\":\"ACTIVE\",\"address\":\"g1ks4ev53j4al8uqhhlahvrfadmz3tlqdguqhxy3\",\"balance\":\"\",\"histories\":[],\"config\":{\"chainId\":\"test2\",\"coinDenom\":\"UGNOT\",\"coinMinimalDenom\":\"ugnot\",\"coinDecimals\":6}}"
];

export const ApproveConnectHardwareWalletSelectAccount = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [accounts, setAccounts] = useState<Array<InstanceType<typeof WalletAccount>>>([]);
  const [selectAccountAddresses, setSelectAccountAddresses] = useState<Array<string>>([]);

  useEffect(() => {
    initAccounts(defaultAccounts.map(WalletAccount.deserialize));
  }, []);

  useEffect(() => {
    if (Array.isArray(location.state?.accounts)) {
      initAccounts(location.state.accounts.map(WalletAccount.deserialize));
    }
  }, [location]);

  const initAccounts = async (accounts: Array<InstanceType<typeof WalletAccount>>) => {
    const storedAccounts = await WalletService.loadAccounts();
    const availSelectAccounts = accounts.filter(account => storedAccounts.find(storedAccount => storedAccount.getAddress() === account.getAddress()) === undefined);
    setAccounts(availSelectAccounts);
    if (availSelectAccounts.length === 0) {
      navigate(RoutePath.ApproveHardwareWalletFinish);
    }
  };

  const onClickSelectButton = (address: string) => {
    if (selectAccountAddresses.includes(address)) {
      setSelectAccountAddresses(selectAccountAddresses.filter(selectAddress => selectAddress !== address));
      return;
    }
    setSelectAccountAddresses([...selectAccountAddresses, address]);
  };

  const onClickNextButton = async () => {
    const selectAccounts = accounts.filter(account => selectAccountAddresses.includes(account.getAddress()));
    const storedAccounts = await WalletService.loadAccounts();
    const savedAccounts: Array<InstanceType<typeof WalletAccount>> = [];

    let ledgerAccountIndex = 1 + storedAccounts.filter(storedAccount => storedAccount.data.signerType === 'LEDGER').length;
    selectAccounts.forEach(account => {
      if (!storedAccounts.find(storedAccount => storedAccount.getAddress() === account.getAddress())) {
        account.setName(`Ledger ${ledgerAccountIndex}`);
        savedAccounts.push(account);
        ledgerAccountIndex += 1;
      }
    });

    await WalletService.saveAccounts([...storedAccounts, ...savedAccounts]);
    navigate(RoutePath.ApproveHardwareWalletFinish);
  };

  const renderAccount = (account: InstanceType<typeof WalletAccount>, index: number) => {
    const selected = selectAccountAddresses.includes(account.getAddress());
    return (
      <div className='item' key={index}>
        <div className='address-wrapper'>
          <span className='address'>{formatAddress(account.getAddress())}</span>
          <span className='path'>{`m/44'/118'/0'/0/${account.data.index - 1}`}</span>
        </div>
        <span className={selected ? 'check active' : 'check'} onClick={() => onClickSelectButton(account.getAddress())}>
          <img className='icon-check' src={IconCheck} alt='check-image' />
        </span>
      </div>
    )
  }

  return (
    <Wrapper>
      <div className='title'>
        <img className='icon' src={IconAddSymbol} alt='logo-image' />
        <TitleWithDesc title={text.title} desc={''} />
      </div>

      <AccountListContainer>
        {accounts.map(renderAccount)}
      </AccountListContainer>

      <Button
        fullWidth
        hierarchy={ButtonHierarchy.Primary}
        margin='auto 0px 0px'
        disabled={selectAccountAddresses.length === 0}
        onClick={onClickNextButton}
      >
        <Text type='body1Bold'>Next</Text>
      </Button>
    </Wrapper>
  );
};
