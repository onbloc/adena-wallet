import React, { ReactElement } from 'react';
import styled, { css, CSSProperties } from 'styled-components';

import mixins from '@styles/mixins';
import { getTheme } from '@styles/theme';

export enum ListHierarchy {
  Default = 'default',
  Normal = 'normal',
  Static = 'static',
}

interface ListBoxStyleProps extends React.ComponentPropsWithoutRef<'div'> {
  cursor?: CSSProperties['cursor'];
  hoverAction?: boolean;
  className?: string;
  padding?: CSSProperties['padding'];
  mode?: ListHierarchy;
}

interface ListBoxProps extends ListBoxStyleProps {
  left: React.ReactNode;
  center: React.ReactNode;
  right: React.ReactNode;
  onClick?: () => void;
}

const modeVariants = {
  default: css`
    background: ${getTheme('neutral', '_7')};
    &:hover {
      background: ${getTheme('neutral', 'b')};
    }
  `,
  normal: css`
    background: ${getTheme('neutral', '_9')};
    &:hover {
      background: ${getTheme('neutral', '_7')};
    }
  `,
  static: css`
    background: ${getTheme('neutral', '_7')};
  `,
};

export const ListBox = ({
  cursor,
  left,
  center,
  right,
  hoverAction,
  onClick,
  className,
  padding,
  mode,
}: ListBoxProps): ReactElement => {
  return (
    <Wrapper
      cursor={cursor}
      hoverAction={hoverAction}
      onClick={onClick}
      className={className}
      padding={padding}
      mode={mode}
    >
      {left && left}
      {center && center}
      {right && right}
    </Wrapper>
  );
};

const Wrapper = styled.div<ListBoxStyleProps>`
  ${mixins.flex({ direction: 'row' })};
  ${({ mode }): any => {
    if (mode === ListHierarchy.Default) return modeVariants.default;
    if (mode === ListHierarchy.Normal) return modeVariants.normal;
    if (mode === ListHierarchy.Static) return modeVariants.static;
    return modeVariants.default;
  }}
  flex-shrink: 0;
  width: 100%;
  height: 60px;
  padding: ${({ padding }): CSSProperties['padding'] => (padding ? padding : '0px 17px 0px 14px')};
  transition: all 0.4s ease;
  border-radius: 18px;
  cursor: ${({ cursor }): CSSProperties['cursor'] => cursor ?? 'pointer'};

  .logo {
    margin-right: 12px;
  }

  & + & {
    margin-top: 12px;
  }
`;
