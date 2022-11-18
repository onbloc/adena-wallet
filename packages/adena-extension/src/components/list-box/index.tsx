import theme from '@styles/theme';
import React from 'react';
import styled, { CSSProperties } from 'styled-components';

interface ListBoxStyleProps extends React.ComponentPropsWithoutRef<'div'> {
  cursor?: CSSProperties['cursor'];
  hoverAction?: boolean;
  gap?: CSSProperties['gap'];
  className?: string;
  padding?: CSSProperties['padding'];
}

interface ListBoxProps extends ListBoxStyleProps {
  left: React.ReactNode;
  center: React.ReactNode;
  right: React.ReactNode;
  onClick?: () => void;
}

const ListBox = ({
  cursor,
  left,
  center,
  right,
  hoverAction,
  onClick,
  className,
  padding,
}: ListBoxProps) => {
  return (
    <Wrapper
      cursor={cursor}
      hoverAction={hoverAction}
      onClick={onClick}
      className={className}
      padding={padding}
    >
      {left && left}
      {center && center}
      {right && right}
    </Wrapper>
  );
};

const Wrapper = styled.div<ListBoxStyleProps>`
  ${({ theme }) => theme.mixins.flexbox('row', 'center', 'center')}
  width: 100%;
  height: 60px;
  background-color: ${({ theme }) => theme.color.neutral[8]};
  padding: ${({ padding }) => (padding ? padding : '0px 17px 0px 14px')};
  transition: all 0.4s ease;
  cursor: ${({ cursor }) => cursor ?? 'pointer'};
  border-radius: 18px;
  & + & {
    margin-top: 12px;
  }
  &:hover {
    background-color: ${({ hoverAction }) => hoverAction && theme.color.neutral[6]};
  }
  & > :nth-child(2) {
    margin-left: 12px;
  }
  & > :nth-child(3) {
    margin-left: auto;
  }
`;

export default ListBox;
