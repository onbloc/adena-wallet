import React from 'react';
import theme from '@styles/theme';
import styled from 'styled-components';
import Typography from './Typography';

interface TitleWithDescProps {
  title: string;
  desc: string;
}

const Wrapper = styled.div`
  display: grid;
  gap: 12px;
  width: 100%;
  text-align: left;
`;

const TitleWithDesc = ({ title, desc }: TitleWithDescProps) => {
  return (
    <Wrapper>
      <Typography type='header4'>{title}</Typography>
      <Typography type='body1Reg' color={theme.color.neutral[2]}>
        {desc}
      </Typography>
    </Wrapper>
  );
};

export default TitleWithDesc;
