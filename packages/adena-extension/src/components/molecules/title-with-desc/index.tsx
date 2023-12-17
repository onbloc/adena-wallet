import React from 'react';
import styled from 'styled-components';

import theme from '@styles/theme';
import { Text } from '../../atoms';

interface TitleWithDescProps {
  title: string;
  desc: string;
  isWarningDesc?: boolean;
  className?: string;
}

const Wrapper = styled.div`
  display: grid;
  gap: 12px;
  width: 100%;
  text-align: left;
`;

export const TitleWithDesc = ({
  title,
  desc,
  isWarningDesc = false,
  className = '',
}: TitleWithDescProps): JSX.Element => {
  return (
    <Wrapper className={className}>
      <Text type='header4'>{title}</Text>
      <Text type='body1Reg' color={isWarningDesc ? theme.color.red[6] : theme.color.neutral[9]}>
        {desc}
      </Text>
    </Wrapper>
  );
};
