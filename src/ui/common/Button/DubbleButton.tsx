import React from 'react';
import styled from 'styled-components';
import { textVariants } from '../Typography';
import { modeVariants } from './FullButton';

interface ButtonProps {
  onClick: () => void;
  text: string;
  props?: React.ComponentPropsWithoutRef<'button'>;
}

interface WrapperStyleProps {
  margin?: string;
}

interface DubbleButtonProps extends WrapperStyleProps {
  leftProps: ButtonProps;
  rightProps: ButtonProps;
}

export const Wrapper = styled.div<WrapperStyleProps>`
  ${({ theme }) => theme.mixins.flexbox('row', 'center', 'space-between')};
  width: 100%;
  gap: 10px;
  ${({ margin }) => margin && `margin: ${margin}`};
`;

export const Button = styled.button`
  ${textVariants.body1Bold};
  color: ${({ theme }) => theme.color.neutral[0]};
  width: 100%;
  height: 48px;
  border-radius: 30px;
  transition: all 0.4s ease;
`;

export const LeftBtn = styled(Button)`
  ${modeVariants['dark']};
`;

export const RightBtn = styled(Button)`
  ${modeVariants['primary']};
`;

const DubbleButton = ({ margin, leftProps, rightProps }: DubbleButtonProps) => {
  return (
    <Wrapper margin={margin}>
      <LeftBtn onClick={leftProps.onClick} {...leftProps.props}>
        {leftProps.text}
      </LeftBtn>
      <RightBtn onClick={rightProps.onClick} {...rightProps.props}>
        {rightProps.text}
      </RightBtn>
    </Wrapper>
  );
};

export default DubbleButton;
