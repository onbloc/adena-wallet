import React from 'react';
import styled, { useTheme } from 'styled-components';

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
  const theme = useTheme();
  return (
    <Wrapper className={className}>
      <Text type='header4'>{title}</Text>
      <Text type='body1Reg' color={isWarningDesc ? theme.red.a : theme.neutral.a}>
        {desc}
      </Text>
    </Wrapper>
  );
};
