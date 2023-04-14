import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import Button, { ButtonHierarchy } from '@components/buttons/button';
import TitleWithDesc from '@components/title-with-desc';
import Text from '@components/text';
import { useLocation, useNavigate } from 'react-router-dom';
import { LedgerConnector, LedgerAccount } from 'adena-module';
import { Account } from 'adena-module';
import IconAddSymbol from '@assets/add-symbol.svg';
import IconCheck from '@assets/check.svg';
import theme from '@styles/theme';
import { formatAddress } from '@common/utils/client-utils';
import { RoutePath } from '@router/path';
import IconArraowDown from '@assets/arrowS-down-gray.svg';
import { useAdenaContext } from '@hooks/use-context';
import { LedgerKeyring, deserializeAccount, serializeAccount } from 'adena-module';

const text = {
  title: 'Select Accounts',
};

const Wrapper = styled.main`
  ${({ theme }) => theme.mixins.flexbox('column', 'center', 'flex-start')};
  width: 100%;
  height: 100%;
  padding: 24px 20px;
  margin: 0 auto;

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
        animation: rotate 1.5s infinite;
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
        width: 15px;
        height: 15px;
        margin: auto;
      }

      &.active,
      &.disabled {
        background-color: ${theme.color.primary[4]};
        border: 1px solid ${theme.color.primary[4]};
        img {
          display: block;
        }
      }

      &.disabled {
        position: relative;
        cursor: default;
        overflow: hidden;
        border: none;

        .mask {
          position: absolute;
          top: 0;
          left: 0;
          width: 20px;
          height: 20px;
          display: block;
          background-color: black;
          opacity: 0.6;
        }
      }
    }
  }
`;

export const ApproveConnectHardwareWalletSelectAccount = () => {
  const { accountService } = useAdenaContext();
  const navigate = useNavigate();
  const location = useLocation();
  const [storedAccounts, setStoredAccounts] = useState<Array<Account>>(
    [],
  );
  const [accounts, setAccounts] = useState<Array<Account>>([]);
  const [selectAccountAddresses, setSelectAccountAddresses] = useState<Array<string>>([]);
  const [lastPath, setLastPath] = useState(-1);
  const [loadPath, setLoadPath] = useState(false);
  const LEDGER_ACCOUNT_LOAD_SIZE = 5;

  useEffect(() => {
    if (Array.isArray(location.state?.accounts)) {
      initAccounts(location.state.accounts.map(deserializeAccount));
    }
  }, [location]);

  const initAccounts = async (accounts: Array<Account>) => {
    const storedAccounts = await accountService.getAccounts();
    setStoredAccounts(storedAccounts);
    setAccounts(accounts);
    const lastPath = accounts.map((account) => account.toData().hdPath ?? 0).reverse()[0];
    setLastPath(lastPath);
  };

  const isStoredAccount = (adderss: string) => {
    return storedAccounts.find((account) => account.getAddress('g') === adderss) !== undefined;
  };

  const onClickSelectButton = (address: string) => {
    if (selectAccountAddresses.includes(address)) {
      setSelectAccountAddresses(
        selectAccountAddresses.filter((selectAddress) => selectAddress !== address),
      );
      return;
    }
    setSelectAccountAddresses([...selectAccountAddresses, address]);
  };

  const onClickLoadMore = async () => {
    setLoadPath(true);
    const accountPaths = Array.from(
      { length: LEDGER_ACCOUNT_LOAD_SIZE },
      (_, index) => index + lastPath + 1,
    );
    const transport = await LedgerConnector.openConnected();
    if (!transport) {
      setLoadPath(false);
      return;
    }
    const ledgerConnector = new LedgerConnector(transport);
    const keyring = await LedgerKeyring.fromLedger(ledgerConnector);
    const ledgerAccounts = [];
    for (const hdPath of accountPaths) {
      const ledgerAccount = await LedgerAccount.createBy(keyring, `Ledger ${hdPath + 1}`, hdPath);
      ledgerAccounts.push(ledgerAccount);
    }
    await initAccounts([...accounts, ...ledgerAccounts]);
    setLoadPath(false);
  };

  const onClickNextButton = async () => {
    const selectAccounts = accounts.filter(account => selectAccountAddresses.includes(account.getAddress('g')));
    const storedAccounts = await accountService.getAccounts();
    const savedAccounts: Array<Account> = [];
    const accountLastIndex = await accountService.getLastAccountIndex() + 1;

    selectAccounts.forEach((account, index) => {
      if (
        !storedAccounts.find((storedAccount) => storedAccount.getAddress('g') === account.getAddress('g'))
      ) {
        const hdPath = account.toData().hdPath ?? 0;
        account.index = accountLastIndex + index;
        account.name = `Ledger ${hdPath + 1}`;
        savedAccounts.push(account);
      }
    });
    const resultSavedAccounts = savedAccounts.sort(account => account.toData().hdPath ?? 0);
    const resultAccounts = [...storedAccounts, ...resultSavedAccounts];
    let currentAccount = null;
    if (resultSavedAccounts.length > 0) {
      currentAccount = resultSavedAccounts[0];
    }

    const locationState = {
      accounts: resultAccounts.map(account => serializeAccount(account)),
      currentAccount: currentAccount ? serializeAccount(currentAccount) : null
    };

    const routePath = storedAccounts.length === 0 ?
      RoutePath.ApproveHardwareWalletLedgerPassword :
      RoutePath.ApproveHardwareWalletFinish;

    navigate(routePath, { state: locationState });
  };

  const renderAccount = (account: Account, index: number) => {
    const hdPath = account.toData().hdPath ?? 0;
    const stored = isStoredAccount(account.getAddress('g'));
    const selected = selectAccountAddresses.includes(account.getAddress('g'));
    return (
      <div className='item' key={index}>
        <div className='address-wrapper'>
          <span className='address'>{formatAddress(account.getAddress('g'))}</span>
          < span className='path' > {`m/44'/118'/0'/0/${hdPath}`}</span>
        </div>
        {stored ? (
          <span className={'check disabled'}>
            <img className='icon-check' src={IconCheck} alt='check-image' />
            <span className={'mask'}></span>
          </span>
        ) : (
          <span
            className={selected ? 'check active' : 'check'}
            onClick={() => onClickSelectButton(account.getAddress('g'))}
          >
            <img className='icon-check' src={IconCheck} alt='check-image' />
          </span>
        )
        }
      </div >
    );
  };

  const renderLoading = () => {
    return (
      <div className='icon-loading'>
        <svg width='9' height='9' viewBox='0 0 9 9' fill='none' xmlns='http://www.w3.org/2000/svg'>
          <circle cx='4.5' cy='4.5' r='3.5' fill='current' />
        </svg>
      </div>
    );
  };

  return (
    <Wrapper>
      <div className='title'>
        <img className='icon' src={IconAddSymbol} alt='logo-image' />
        <TitleWithDesc title={text.title} desc={''} />
      </div>

      <AccountListContainer>
        <div className='list-wrapper'>
          {accounts.length > 0 ? (
            accounts.map(renderAccount)
          ) : (
            <span className='description'>{'No data to display'}</span>
          )}
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
        disabled={loadPath || selectAccountAddresses.length === 0}
        onClick={onClickNextButton}
      >
        <Text type='body1Bold'>Next</Text>
      </Button>
    </Wrapper>
  );
};
