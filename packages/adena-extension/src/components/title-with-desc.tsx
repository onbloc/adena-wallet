import React from 'react';
import theme from '@styles/theme';
import styled from 'styled-components';
import Text from './text';

interface TitleWithDescProps {
  title: string;
  desc: string;
  isWarningDesc?: boolean;
}

const Wrapper = styled.div`
  display: grid;
  gap: 12px;
  width: 100%;
  text-align: left;
`;

const TitleWithDesc = ({ title, desc, isWarningDesc = false }: TitleWithDescProps) => {
  return (
    <Wrapper>
      <Text type='header4'>{title}</Text>
      <Text type='body1Reg' color={isWarningDesc ? theme.color.red[6] : theme.color.neutral[9]}>
        {desc}
      </Text>
    </Wrapper>
  );
};

export default TitleWithDesc;
