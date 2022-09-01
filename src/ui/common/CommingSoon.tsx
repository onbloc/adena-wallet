import React from 'react';
import styled from 'styled-components';
import Typography from './Typography';

const Wrapper = styled.div`
  ${({ theme }) => theme.mixins.flexbox('row', 'center', 'center')};
  ${({ theme }) => theme.mixins.positionCenter()};
  width: 170px;
  height: 25px;
  background-color: ${({ theme }) => theme.color.neutral[3]};
  filter: drop-shadow(12px 12px 24px #000000);
  border-radius: 12.5px;
  z-index: 1;
`;

export const CommingSoon = () => {
  return (
    <Wrapper>
      <Typography type='body2Reg'>Comming Soon!</Typography>
    </Wrapper>
  );
};
