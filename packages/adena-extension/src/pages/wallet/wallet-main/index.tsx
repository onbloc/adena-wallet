import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import Text from '@components/text';
import { useNavigate } from 'react-router-dom';
import { RoutePath } from '@router/path';
import LoadingWallet from '@components/loading-screen/loading-wallet';
import DubbleButton from '@components/buttons/double-button';
import ListBox from '@components/list-box';
import { useWalletBalances } from '@hooks/use-wallet-balances';
import { useWallet } from '@hooks/use-wallet';
import { useWalletAccounts } from '@hooks/use-wallet-accounts';
import { maxFractionDigits } from '@common/utils/client-utils';
import { useGnoClient } from '@hooks/use-gno-client';
import { useCurrentAccount } from '@hooks/use-current-account';

const Wrapper = styled.main`
  padding-top: 14px;
  text-align: center;
`;

export const WalletMain = () => {
  const navigate = useNavigate();
  const DepositButtonClick = () => navigate(RoutePath.WalletSearch, { state: 'deposit' });
  const SendButtonClick = () => navigate(RoutePath.WalletSearch, { state: 'send' });
  const CoinBoxClick = () => navigate(RoutePath.TokenDetails);
  const [wallet, state] = useWallet();
  const [gnoClient] = useGnoClient();
  const [, updateWalletAccounts] = useWalletAccounts(wallet);
  const [balances, updateBalances] = useWalletBalances();
  const [currentBalances, setCurrentBalances] = useState<Array<any>>([]);
  const [currentAccount, updateCurrentAccountInfo] = useCurrentAccount();
  const [currentBalance, setCurrentBalance] = useState('');

  useEffect(() => {
    if (gnoClient && state === 'FINISH') {
      updateWalletAccounts();
    }
  }, [state, gnoClient]);

  useEffect(() => {
    if (currentAccount?.getAddress()) {
      updateBalances();
      updateCurrentAccountInfo();
    }
  }, [currentAccount?.getAddress()])

  useEffect(() => {
    if (balances && balances.length > 0) {
      const amount = maxFractionDigits(balances[0].amount ?? 0, 6);
      const unit = balances[0].type;
      const currentBalance = `${amount}\n${unit}`;
      setCurrentBalance(currentBalance);
      setCurrentBalances(balances);
    }
  }, [balances]);

  return (
    <>
      {state === 'FINISH' ? (
        currentBalance &&
        balances && (
          <Wrapper>
            <Text type='header2' textAlign='center'>
              {currentBalance}
            </Text>
            <DubbleButton
              margin='14px 0px 30px'
              leftProps={{ onClick: DepositButtonClick, text: 'Deposit' }}
              rightProps={{
                onClick: SendButtonClick,
                text: 'Send',
              }}
            />
            {currentBalances.map((item, index) => (
              <ListBox
                left={<img src={item.img} alt='logo image' />}
                center={<Text type='body1Bold'>{item.name || ''}</Text>}
                right={
                  <Text type='body2Reg'>{`${maxFractionDigits(item.amount ?? 0, 6)} ${item.type ?? ''
                    }`}</Text>
                }
                hoverAction={true}
                gap={12}
                key={index}
                onClick={CoinBoxClick}
              />
            ))}
          </Wrapper>
        )
      ) : (
        <LoadingWallet />
      )}
    </>
  );
};
