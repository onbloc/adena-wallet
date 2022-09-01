import React, { useState, useEffect, useRef } from 'react';
import styled from 'styled-components';
import Typography from '@ui/common/Typography';
import gnos from '../../../../assets/gnos-logo.svg';
import search from '../../../../assets/search.svg';
import cancel from '../../../../assets/cancel-dark.svg';
import gnot from '../../../../assets/gnot-logo.svg';
import CoinBox from '@ui/common/CoinBox';
import FullButton from '@ui/common/Button/FullButton';
import { useLocation, useNavigate } from 'react-router-dom';
import { RoutePath } from '@router/path';
import DefaultInput from '@ui/common/DefaultInput';
import { useSdk } from '@services/client';

const dummy = [
  {
    name: 'Gnoland',
    img: gnot,
    amount: '43,822,3923',
    type: 'GNOT',
  },
  {
    name: 'Gnoswap',
    img: gnos,
    amount: '2.844',
    type: 'GNOS',
  },
  {
    name: 'Gnoswap',
    img: gnos,
    amount: '0',
    type: 'GNOS',
  },
  {
    name: 'Gnoland',
    img: gnot,
    amount: '19,575,7268',
    type: 'GNOT',
  },
  {
    name: 'Gnoland',
    img: gnot,
    amount: '43,822,3923',
    type: 'GNOT',
  },
  {
    name: 'Gnoswap',
    img: gnos,
    amount: '4.361',
    type: 'GNOS',
  },
];

const Wrapper = styled.section`
  width: 100%;
  height: 100%;
  padding-top: 30px;
  padding-bottom: 120px;
  overflow-y: scroll;
  -ms-overflow-style: none;
  scrollbar-width: none;
  &::-webkit-scrollbar {
    display: none;
  }
`;

const SearchBox = styled.div`
  position: relative;
  width: 100%;
`;

const SearchClickBtn = styled.button`
  width: 24px;
  height: 24px;
  background: url(${search}) no-repeat center center;
  ${({ theme }) => theme.mixins.posTopCenterLeft('11px')};
  cursor: default;
`;

const Input = styled(DefaultInput)`
  padding: 14px 35px 14px 40px;
`;

const InputResetBtn = styled.button`
  width: 24px;
  height: 24px;
  background: url(${cancel}) no-repeat center center;
  ${({ theme }) => theme.mixins.posTopCenterRight('11px')}
`;

const DataListWrap = styled.div`
  margin-top: 30px;
`;

const ButtonWrap = styled.div`
  ${({ theme }) => theme.mixins.flexbox('row', 'center', 'center')};
  position: fixed;
  bottom: 0px;
  left: 0px;
  width: 100%;
  height: 96px;
  padding: 0px 20px;
  box-shadow: 0px -4px 4px rgba(0, 0, 0, 0.4);
  background-color: ${({ theme }) => theme.color.neutral[7]};
  z-index: 1;
`;

export const WalletSearchView = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const CoinBoxButtonClick = () => {
    location.state === 'send'
      ? navigate(RoutePath.GeneralSend, { state: 'search' })
      : navigate(RoutePath.Deposit, { state: 'wallet' });
  };

  const { address, gnoClient: client, getSigner, balance, refreshBalance } = useSdk();

  useEffect(() => {
    if (!address) {
      return;
    }
    const signer = getSigner();
    if (!client || !signer) {
      return;
    }
    (async (): Promise<void> => {
      await refreshBalance();
    })();
  }, [address, client, getSigner, balance, refreshBalance]);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [searchText, setSearchText] = useState('');
  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchText(e.target.value);
  };

  const inputResetClick = () => {
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
        {balance
          .filter((obj) => {
            return (
              obj.name.toLocaleLowerCase().includes(searchText.toLocaleLowerCase()) ||
              obj.type.toLocaleLowerCase().includes(searchText.toLocaleLowerCase())
            );
          })
          .map((item, idx) => (
            <CoinBox
              key={idx}
              logo={item.img}
              name={item.name}
              amount={item.amount}
              amountType={item.type}
              onClick={CoinBoxButtonClick}
            />
          ))}
      </DataListWrap>
      <ButtonWrap>
        <FullButton mode='dark' onClick={() => navigate(-1)}>
          <Typography type='body1Bold'>Close</Typography>
        </FullButton>
      </ButtonWrap>
    </Wrapper>
  );
};
