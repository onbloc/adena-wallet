import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import Button, { ButtonHierarchy } from '@components/buttons/button';
import TitleWithDesc from '@components/title-with-desc';
import Text from '@components/text';
import { useLocation, useNavigate } from 'react-router-dom';
import { Wallet, WalletAccount } from 'adena-module';
import IconAddSymbol from '@assets/add-symbol.svg';
import IconCheck from '@assets/check.svg';
import theme from '@styles/theme';
import { formatAddress } from '@common/utils/client-utils';
import { WalletService } from '@services/index';
import { RoutePath } from '@router/path';
import IconArraowDown from '@assets/arrowS-down-gray.svg';

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
  border-radius: 10px;
  border: 1px solid ${theme.color.neutral[6]};
  background-color: ${theme.color.neutral[8]};
  overflow: hidden;

  @keyframes rotate {
    from {
      -webkit-transform: rotate(0deg);
      -o-transform: rotate(0deg);
      transform: rotate(0deg);
    }
    to {
      -webkit-transform: rotate(360deg);
      -o-transform: rotate(360deg);
      transform: rotate(360deg);
    }
  }

  .list-wrapper {
    display: flex;
    flex-direction: column;
    flex-shrink: 1;
    width: 100%;
    height: 100%;
    overflow: auto;

    .description {
      display: flex;
      width: 100%;
      padding: 20px;
      color: ${theme.color.neutral[9]};
      justify-content: center;
      align-items: center;
    }
  }

  .load-more-button {
    display: flex;
    flex-direction: row;
    flex-shrink: 0;
    width: 100%;
    height: 46px;
    align-items: center;
    justify-content: center;
    color: ${theme.color.neutral[9]};
    border-top: 1px solid ${theme.color.neutral[6]};
    border-radius: 0;

    & .icon-loading {
      display: flex;
      width: 15px;
      height: 100%;
      align-items: center;
      justify-content: center;
      svg {
        animation: rotate 2s infinite
      }
      circle {
        stroke: ${theme.color.neutral[9]};
        stroke-dasharray: 10;
        stroke-dashoffset: 7;
      }
    }

    & img {
      margin-left: 3px;
    }

    &:hover {
      background-color: ${theme.color.neutral[6]};
    }
  }

  .item {
    display: flex;
    flex-direction: row;
    width: 100%;
    height: 46px;
    padding: 10px 20px;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid ${theme.color.neutral[6]};

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
  const [lastPath, setLastPath] = useState(-1);
  const [loadPath, setLoadPath] = useState(false);
  const LEDGER_ACCOUNT_LOAD_SIZE = 5;

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
    const lastPath = accounts.map(account => account.data.path).reverse()[0];
    setLastPath(lastPath);
  };

  const onClickSelectButton = (address: string) => {
    if (selectAccountAddresses.includes(address)) {
      setSelectAccountAddresses(selectAccountAddresses.filter(selectAddress => selectAddress !== address));
      return;
    }
    setSelectAccountAddresses([...selectAccountAddresses, address]);
  };

  const onClickLoadMore = async () => {
    setLoadPath(true);
    try {
      const accountPaths = Array.from({ length: LEDGER_ACCOUNT_LOAD_SIZE }, (_, index) => index + lastPath + 1);
      const ledgerWallet = await Wallet.createByLedger(accountPaths);
      await ledgerWallet.initAccounts();
      await initAccounts([...accounts, ...ledgerWallet.getAccounts()]);
    } catch (e) {
      console.error(e);
    }
    setLoadPath(false);
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
          <span className='path'>{`m/44'/118'/0'/0/${account.data.path}`}</span>
        </div>
        <span className={selected ? 'check active' : 'check'} onClick={() => onClickSelectButton(account.getAddress())}>
          <img className='icon-check' src={IconCheck} alt='check-image' />
        </span>
      </div>
    )
  }

  const renderLoading = () => {
    return (
      <div className='icon-loading'>
        <svg width="9" height="9" viewBox="0 0 9 9" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="4.5" cy="4.5" r="3.5" fill="current" />
        </svg>
      </div>
    );
  }

  return (
    <Wrapper>
      <div className='title'>
        <img className='icon' src={IconAddSymbol} alt='logo-image' />
        <TitleWithDesc title={text.title} desc={''} />
      </div>

      <AccountListContainer>
        <div className='list-wrapper'>
          {accounts.length > 0 ? accounts.map(renderAccount) : <span className='description'>{'No data to display'}</span>}
        </div>
        <Button className='load-more-button' onClick={onClickLoadMore} disabled={loadPath}>
          {loadPath ? 'Loading' : 'Load more accounts'}
          {loadPath ? renderLoading() : <img src={IconArraowDown} />}
        </Button>
      </AccountListContainer>

      <Button
        fullWidth
        hierarchy={ButtonHierarchy.Primary}
        margin='auto 0px 0px'
        disabled={loadPath}
        onClick={onClickNextButton}
      >
        <Text type='body1Bold'>Next</Text>
      </Button>
    </Wrapper>
  );
};
