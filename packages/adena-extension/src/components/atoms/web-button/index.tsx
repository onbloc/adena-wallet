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
  fixed?: boolean;
} & (
    | { text: string; rightIcon?: 'chevronRight' }
    | {
      children: ReactNode;
    }
  ) &
  ButtonHTMLAttributes<HTMLButtonElement>;

const StyledButtonBase = styled.button<{ size: 'full' | 'large' | 'small'; fixed?: boolean; }>`
  cursor: pointer;
  border: none;
  border-radius: ${({ size }): string => (size === 'small' ? '12px' : '14px')};
  padding: ${({ size }): string => (size === 'large' ? '12px 16px 16px' : '8px 16px')};
  display: flex;
  flex-direction: row;
  width: ${({ size }): string => (size === 'full' ? '100%' : 'auto')};
  height: 44px;
  justify-content: center;
  align-items: center;
  ${({ fixed }): FlattenSimpleInterpolation | string => fixed ? css`flex-shrink: 0;` : ''};

  :disabled {
    cursor: default;
    opacity: 0.4;
  }
`;

const StyledButtonPrimary = styled(StyledButtonBase)`
  color: ${getTheme('webNeutral', '_100')};
  background: linear-gradient(180deg, #0059FF 0%, #004BD6 100%);
  box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.4) inset;

  ${({ disabled }): FlattenSimpleInterpolation | string => !disabled ? css`
    :hover {
      box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.4) inset, 0px 0px 24px 0px #0059FF52, 0px 1px 3px 0px #0000001A, 0px 1px 2px 0px #0000000F;
    }
    :active {
      box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.4) inset, 0px 0px 24px 0px #0059FF52, 0px 0px 0px 3px #0059FF29, 0px 1px 3px 0px #0000001A, 0px 1px 2px 0px #0000000F;
    }
  `: ''}
`;

const StyledButtonSecondary = styled(StyledButtonBase)`
  color: #ADCAFF;
  background: rgba(0, 89, 255, 0.16);
  box-shadow: 0 0 0 1px rgba(122, 169, 255, 0.24) inset;

  ${({ disabled }): FlattenSimpleInterpolation | string => !disabled ? css`
    :hover {
      color: #ADCAFF;
      background: linear-gradient(180deg, rgba(0, 89, 255, 0.20) 0%, rgba(0, 89, 255, 0.00) 100%);
      box-shadow: 0 0 0 2px rgba(122, 169, 255, 0.24) inset, 0px 1px 3px 0px #0000001A, 0px 1px 2px 0px #0000000F;
    }

    :active {
      color: #7AA9FF;
      background: 0 0 0 2px rgba(122, 169, 255, 0.24) inset, linear-gradient(180deg, rgba(0, 89, 255, 0.20) 0%, rgba(0, 89, 255, 0.00) 100%);
    }
  `: ''}

  :disabled {
    color: #7AA9FF;
    opacity: 0.4;
    background: rgba(0, 89, 255, 0.16);
  }
`;

const StyledButtonTertiary = styled(StyledButtonBase)`
  color: ${getTheme('webNeutral', '_300')};
  background: rgba(188, 197, 214, 0.04);
  box-shadow: 0 0 0 1px rgba(188, 197, 214, 0.24) inset;

  svg * {
    fill: ${getTheme('webNeutral', '_300')};
  }

  ${({ disabled, theme }): FlattenSimpleInterpolation | string => !disabled ? css`
    :hover {
      background: rgba(188, 197, 214, 0.06);
      box-shadow: 0 0 0 2px rgba(188, 197, 214, 0.24) inset, 0px 1px 3px 0px rgba(0, 0, 0, 0.10), 0px 1px 2px 0px rgba(0, 0, 0, 0.06);
      svg * {
        fill: ${theme.webNeutral._100};
      }
    }
    :active {
      color: ${theme.webNeutral._100};
      box-shadow: 0 0 0 1px rgba(188, 197, 214, 0.24) inset, 0px 0px 16px 0px rgba(255, 255, 255, 0.04), 0px 0px 0px 4px rgba(255, 255, 255, 0.04), 0px 1px 3px 0px rgba(0, 0, 0, 0.10), 0px 1px 2px 0px rgba(0, 0, 0, 0.06);
      svg * {
        fill: ${theme.webNeutral._100};
      }
    }
  `: ''}
`;

const StyledButtonTertiarySmall = styled(StyledButtonTertiary)`
  color: ${getTheme('webNeutral', '_300')};
  padding: 8px 36px;
  border-radius: 12px;
  border: 1px solid rgba(188, 197, 214, 0.16);
  background: rgba(188, 197, 214, 0.08);

  svg * {
    fill: ${getTheme('webNeutral', '_300')};
  }

  ${({ disabled, theme }): FlattenSimpleInterpolation | string => !disabled ? css`
    :hover {
      color: ${theme.webNeutral._100};
      box-shadow: 0 0 0 1px rgba(188, 197, 214, 0.16) inset;
      svg * {
        fill: ${theme.webNeutral._100};
      }
    }
    :active {
      color: ${theme.webNeutral._100};
      box-shadow: 0 0 0 1px rgba(188, 197, 214, 0.16) inset;
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
  fixed,
  ...rest
}: WebButtonProps): ReactElement => {
  let StyledComponent;
  switch (figure) {
    case 'secondary':
      StyledComponent = StyledButtonSecondary;
      break;
    case 'tertiary':
      if (rest.size === 'small') {
        StyledComponent = StyledButtonTertiarySmall;
      } else {
        StyledComponent = StyledButtonTertiary;
      }
      break;
    case 'quaternary':
      StyledComponent = StyledButtonQuaternary;
      break;

    // primary
    default:
      StyledComponent = StyledButtonPrimary;
  }

  const isRightButton = 'text' in rest && rest.rightIcon === 'chevronRight';

  const isFixed = fixed || rest.size === 'small';

  return (
    <StyledComponent fixed={isFixed} {...rest}>
      {'text' in rest ? (
        <Row style={{ gap: 4, alignItems: 'center', justifyContent: 'space-between' }}>
          {isRightButton && (
            <View style={{ width: 12 }} />
          )}
          <WebText type={textType} color={'inherit'}>
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
