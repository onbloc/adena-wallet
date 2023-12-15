import React, { useState, useRef } from 'react';
import styled, { CSSProp } from 'styled-components';
import BigNumber from 'bignumber.js';
import { useLocation, useNavigate } from 'react-router-dom';

import Text from '@components/text';
import search from '../../../assets/search.svg';
import cancel from '../../../assets/cancel-dark.svg';
import Button, { ButtonHierarchy } from '@components/buttons/button';
import { RoutePath } from '@router/path';
import DefaultInput from '@components/default-input';
import { searchTextFilter } from '@common/utils/client-utils';
import ListBox, { ListHierarchy } from '@components/list-box';
import { useTokenBalance } from '@hooks/use-token-balance';
import UnknownTokenIcon from '@assets/common-unknown-token.svg';
import TokenBalanceComponent from '@components/common/token-balance/token-balance';
import useHistoryData from '@hooks/use-history-data';

import { TokenBalance } from '@types';

const Wrapper = styled.main`
  width: 100%;
  height: 100%;
  padding-top: 30px;
  padding-bottom: 120px;
  overflow-y: auto;
`;

const SearchBox = styled.div`
  position: relative;
  width: 100%;
`;

const SearchClickBtn = styled.button`
  width: 24px;
  height: 24px;
  background: url(${search}) no-repeat center center;
  ${({ theme }): CSSProp => theme.mixins.posTopCenterLeft('11px')};
  cursor: default;
`;

const Input = styled(DefaultInput)`
  padding: 14px 35px 14px 40px;
`;

const InputResetBtn = styled.button`
  width: 24px;
  height: 24px;
  background: url(${cancel}) no-repeat center center;
  ${({ theme }): CSSProp => theme.mixins.posTopCenterRight('11px')}
`;

const DataListWrap = styled.div`
  margin-top: 30px;

  .logo {
    width: 34px;
    height: 34px;
  }
`;

const ButtonWrap = styled.div`
  ${({ theme }): CSSProp => theme.mixins.flexbox('row', 'center', 'center')};
  position: fixed;
  bottom: 0px;
  left: 0px;
  width: 100%;
  height: 96px;
  padding: 0px 20px;
  box-shadow: 0px -4px 4px rgba(0, 0, 0, 0.4);
  background-color: ${({ theme }): string => theme.color.neutral[7]};
  z-index: 1;
`;

export const WalletSearch = (): JSX.Element => {
  const navigate = useNavigate();
  const location = useLocation();

  const { displayTokenBalances } = useTokenBalance();
  const { clearHistoryData } = useHistoryData();

  const inputRef = useRef<HTMLInputElement | null>(null);
  const [searchText, setSearchText] = useState('');
  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const regex = /^[a-zA-Z0-9]*$/;
    if (!regex.test(e.target.value)) {
      return;
    }
    setSearchText(e.target.value);
  };

  const onClickItem = (tokenBalance: TokenBalance): void => {
    location.state === 'send' ? moveTransferInput(tokenBalance) : moveDeposit(tokenBalance);
  };

  const moveTransferInput = (tokenBalance: TokenBalance): void => {
    clearHistoryData(RoutePath.TransferInput);
    navigate(RoutePath.TransferInput, {
      state: {
        isTokenSearch: true,
        tokenBalance,
      },
    });
  };

  const moveDeposit = (tokenBalance: TokenBalance): void => {
    navigate(RoutePath.Deposit, {
      state: {
        type: 'wallet',
        tokenMetainfo: tokenBalance,
      },
    });
  };

  const inputResetClick = (): void => {
    if (inputRef.current) {
      setSearchText('');
      inputRef.current.focus();
    }
  };

  return (
    <Wrapper>
      <SearchBox>
        <SearchClickBtn type='button' />
        <Input
          value={searchText}
          type='text'
          placeholder='Search'
          onChange={handleTextChange}
          ref={inputRef}
        />
        {Boolean(searchText) && <InputResetBtn onClick={inputResetClick} type='button' />}
      </SearchBox>
      <DataListWrap>
        {displayTokenBalances
          .filter(
            (balance) =>
              searchTextFilter(balance.name ?? '', searchText) ||
              searchTextFilter(balance.symbol ?? '', searchText),
          )
          .map((balance, idx) => (
            <ListBox
              left={
                <img
                  src={balance.image || `${UnknownTokenIcon}`}
                  alt='logo image'
                  className='logo'
                />
              }
              center={
                <Text type='body2Bold' margin='0px auto 0px 0px'>
                  {balance.name}
                </Text>
              }
              right={
                <TokenBalanceComponent
                  value={BigNumber(balance.amount.value).toFormat()}
                  denom={balance.amount.denom}
                  fontStyleKey='body2Reg'
                  minimumFontSize='11px'
                  orientation='HORIZONTAL'
                />
              }
              hoverAction={true}
              key={idx}
              onClick={(): void => onClickItem(balance)}
              mode={ListHierarchy.Normal}
            />
          ))}
      </DataListWrap>
      <ButtonWrap>
        <Button
          fullWidth
          hierarchy={ButtonHierarchy.Dark}
          onClick={(): void => navigate(RoutePath.Wallet)}
        >
          <Text type='body1Bold'>Close</Text>
        </Button>
      </ButtonWrap>
    </Wrapper>
  );
};
