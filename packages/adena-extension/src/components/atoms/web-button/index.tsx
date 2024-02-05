import React, { ButtonHTMLAttributes, ReactElement, ReactNode } from 'react';
import styled, { css, FlattenSimpleInterpolation } from 'styled-components';

import { getTheme, WebFontType } from '@styles/theme';
import IconRight from '@assets/web/chevron-right.svg';

import { WebImg } from '../web-img';
import { WebText } from '../web-text';
import { Row, View } from '../base';

type WebButtonProps = {
  size: 'full' | 'large' | 'small';
  textType?: WebFontType;
  figure: 'primary' | 'secondary' | 'tertiary' | 'quaternary';
} & (
    | { text: string; rightIcon?: 'chevronRight' }
    | {
      children: ReactNode;
    }
  ) &
  ButtonHTMLAttributes<HTMLButtonElement>;

const StyledButtonBase = styled.button<{ size: 'full' | 'large' | 'small' }>`
  cursor: pointer;
  border: transparent;
  border-radius: ${({ size }): string => (size === 'small' ? '12px' : '14px')};
  padding: ${({ size }): string => (size === 'large' ? '12px 16px 16px' : '8px 16px')};
  display: flex;
  flex-direction: row;
  width: ${({ size }): string => (size === 'full' ? '100%' : 'auto')};
  height: ${({ size }): string => (size === 'small' ? '44px' : 'auto')};
  justify-content: center;
  align-items: center;

  :disabled {
    cursor: default;
    opacity: 0.4;
  }
`;

const StyledButtonPrimary = styled(StyledButtonBase)`
  color: ${getTheme('webNeutral', '_100')};
  border: 1px solid rgba(255, 255, 255, 0.40);
  background: linear-gradient(180deg, #0059FF 0%, #004BD6 100%);

  ${({ disabled }): FlattenSimpleInterpolation | string => !disabled ? css`
    :hover,
    :active {
      box-shadow: 0px 0px 24px 0px rgba(0, 89, 255, 0.32), 0px 1px 3px 0px rgba(0, 0, 0, 0.10), 0px 1px 2px 0px rgba(0, 0, 0, 0.06);
    }
  `: ''}
`;

const StyledButtonSecondary = styled(StyledButtonBase)`
  color: #ADCAFF;
  border: 1px solid rgba(122, 169, 255, 0.24);
  background: rgba(0, 89, 255, 0.16);

  ${({ disabled }): FlattenSimpleInterpolation | string => !disabled ? css`
    :hover {
      color: #ADCAFF;
      border: 1px solid rgba(122, 169, 255, 0.24);
      background: rgba(0, 89, 255, 0.20);
      box-shadow: 0px 1px 3px 0px rgba(0, 0, 0, 0.10), 0px 1px 2px 0px rgba(0, 0, 0, 0.06);
    }

    :active {
      color: #7AA9FF;
      border: 1px solid rgba(122, 169, 255, 0.24);
      background: rgba(0, 89, 255, 0.20);
    }
  `: ''}

  :disabled {
    color: #7AA9FF;
    border: 1px solid rgba(122, 169, 255, 0.24);
    opacity: 0.4;
    background: rgba(0, 89, 255, 0.16);
  }
`;

const StyledButtonTertiary = styled(StyledButtonBase)`
  color: ${getTheme('webNeutral', '_300')};
  border: 1px solid rgba(188, 197, 214, 0.24);
  background: rgba(188, 197, 214, 0.04);

  svg * {
    fill: ${getTheme('webNeutral', '_300')};
  }

  ${({ disabled, theme }): FlattenSimpleInterpolation | string => !disabled ? css`
    :hover {
      border: 1px solid rgba(188, 197, 214, 0.24);
      background: rgba(188, 197, 214, 0.06);
      box-shadow: 0px 1px 3px 0px rgba(0, 0, 0, 0.10), 0px 1px 2px 0px rgba(0, 0, 0, 0.06);
      svg * {
        fill: ${theme.webNeutral._100};
      }
    }
    :active {
      color: ${theme.webNeutral._100};
      box-shadow: 0px 0px 16px 0px rgba(255, 255, 255, 0.04), 0px 0px 0px 4px rgba(255, 255, 255, 0.04), 0px 1px 3px 0px rgba(0, 0, 0, 0.10), 0px 1px 2px 0px rgba(0, 0, 0, 0.06);
      svg * {
        fill: ${theme.webNeutral._100};
      }
    }
  `: ''}
`;

const StyledButtonQuaternary = styled(StyledButtonBase)`
  outline: 1px solid rgba(188, 197, 214, 0.16);
  background: rgba(188, 197, 214, 0.04);
  border-radius: 8px;
  border: 1px solid #212429;

  :hover {
    color: #fff;
    background: rgba(255, 255, 255, 0.08);
  }

  :active {
    color: #fff;
    background: rgba(255, 255, 255, 0.08);
  }
`;

export const WebButton = ({
  figure,
  textType = 'title4',
  children,
  ...rest
}: WebButtonProps): ReactElement => {
  let StyledComponent;
  switch (figure) {
    case 'secondary':
      StyledComponent = StyledButtonSecondary;
      break;
    case 'tertiary':
      StyledComponent = StyledButtonTertiary;
      break;
    case 'quaternary':
      StyledComponent = StyledButtonQuaternary;
      break;

    // primary
    default:
      StyledComponent = StyledButtonPrimary;
  }

  const isRightButton = 'text' in rest && rest.rightIcon === 'chevronRight';

  return (
    <StyledComponent {...rest}>
      {'text' in rest ? (
        <Row style={{ gap: 4, alignItems: 'flex-end', justifyContent: 'space-between' }}>
          {isRightButton && (
            <View style={{ width: 12 }} />
          )}
          <WebText type={textType}>
            {rest.text}
          </WebText>
          {isRightButton && (
            <View style={{ marginRight: 4 }}>
              <WebImg src={IconRight} size={24} />
            </View>
          )}
        </Row>
      ) : (
        children
      )}
    </StyledComponent>
  );
};
