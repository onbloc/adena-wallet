import React from 'react';
import styled from 'styled-components';
import Typography from './Typography';

interface CoinBoxProps {
  logo: string;
  name: string;
  amount: string;
  amountType: string;
  onClick: () => void;
}

const Wrapper = styled.div`
  ${({ theme }) => theme.mixins.flexbox('row', 'center', 'space-between')};
  background-color: ${({ theme }) => theme.color.neutral[8]};
  width: 100%;
  height: 60px;
  padding: 0px 17px 0px 14px;
  border-radius: 18px;
  cursor: pointer;
  transition: all 0.4s ease;
  :hover {
    background-color: rgba(0, 89, 255, 0.04);
  }
  & + & {
    margin-top: 12px;
  }
  & > .coin-box {
    margin: 0px auto 0px 12px;
  }
`;

const CoinBox = ({ logo, name, amount, amountType, onClick }: CoinBoxProps) => {
  return (
    <Wrapper onClick={onClick}>
      <img src={logo} alt='logo image' />
      <Typography className='coin-box' type='body1Bold'>
        {name}
      </Typography>
      <Typography type='body2Reg'>{`${amount} ${amountType}`}</Typography>
    </Wrapper>
  );
};

export default CoinBox;
