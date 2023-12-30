import React from 'react';
import styled from 'styled-components';

import { FontsType } from '@styles/theme';
import { Text, Button, ButtonProps } from '@components/atoms';
import mixins from '@styles/mixins';

interface EachButtonProps {
  onClick: () => void;
  text: string;
  props?: React.ComponentPropsWithoutRef<'button'>;
  hierarchy?: ButtonProps['hierarchy'];
  bgColor?: string;
  fontType?: FontsType;
}

interface WrapperStyleProps {
  margin?: string;
}

interface DoubleButtonProps extends WrapperStyleProps {
  leftProps: EachButtonProps;
  rightProps: EachButtonProps;
}

const Wrapper = styled.div<WrapperStyleProps>`
  ${mixins.flex({ direction: 'row', justify: 'space-between' })};
  width: 100%;
  gap: 10px;
  ${({ margin }): string | undefined => margin && `margin: ${margin}`};
`;

export const DoubleButton = ({ margin, leftProps, rightProps }: DoubleButtonProps): JSX.Element => {
  return (
    <Wrapper margin={margin}>
      <Button
        fullWidth
        hierarchy={leftProps.hierarchy ?? 'dark'}
        onClick={leftProps.onClick}
        bgColor={leftProps.bgColor}
        {...leftProps.props}
      >
        <Text type={leftProps.fontType ?? 'body1Bold'}>{leftProps.text}</Text>
      </Button>
      <Button
        fullWidth
        hierarchy={rightProps.hierarchy ?? 'primary'}
        onClick={rightProps.onClick}
        bgColor={rightProps.bgColor}
        {...rightProps.props}
      >
        <Text type={rightProps.fontType ?? 'body1Bold'}>{rightProps.text}</Text>
      </Button>
    </Wrapper>
  );
};
