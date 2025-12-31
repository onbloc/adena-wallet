import React, { ButtonHTMLAttributes, ReactElement, ReactNode } from 'react';
import styled, { css, RuleSet } from 'styled-components';

import IconRight from '@assets/web/chevron-right.svg';
import { getTheme, WebFontType } from '@styles/theme';

import { Row, View } from '../base';
import { WebImg } from '../web-img';
import { WebText } from '../web-text';

type WebButtonProps = {
  buttonRef?: React.RefObject<HTMLButtonElement>;
  size: 'full' | 'large' | 'small';
  textType?: WebFontType;
  figure: 'primary' | 'secondary' | 'tertiary' | 'quaternary' | 'quinary';
  fixed?: boolean;
} & (
  | { text: string; rightIcon?: 'chevronRight' }
  | {
      children: ReactNode;
    }
) &
  ButtonHTMLAttributes<HTMLButtonElement>;

const StyledButtonBase = styled.button.withConfig({
  shouldForwardProp: (prop) => !['ref', 'size', 'fixed', 'rightIcon'].includes(prop),
})<{ size: 'full' | 'large' | 'small'; fixed?: boolean }>`
  & {
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
    ${({ fixed }): RuleSet | string =>
      fixed
        ? css`
            flex-shrink: 0;
          `
        : ''};

    &:disabled {
      cursor: default;
      opacity: 0.4;
    }
  }
`;

const StyledButtonPrimary = styled(StyledButtonBase)`
  & {
    color: ${getTheme('webNeutral', '_100')};
    background: linear-gradient(180deg, #0059ff 0%, #004bd6 100%);
    box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.4) inset;

    ${({ disabled }): RuleSet | string =>
      !disabled
        ? css`
            &:hover {
              box-shadow:
                0 0 0 2px rgba(255, 255, 255, 0.4) inset,
                0px 0px 24px 0px #0059ff52,
                0px 1px 3px 0px #0000001a,
                0px 1px 2px 0px #0000000f;
            }
            &:active {
              box-shadow:
                0 0 0 2px rgba(255, 255, 255, 0.4) inset,
                0px 0px 24px 0px #0059ff52,
                0px 0px 0px 3px #0059ff29,
                0px 1px 3px 0px #0000001a,
                0px 1px 2px 0px #0000000f;
            }
          `
        : ''}
  }
`;

const StyledButtonSecondary = styled(StyledButtonBase)`
  & {
    color: #adcaff;
    background: rgba(0, 89, 255, 0.16);
    box-shadow: 0 0 0 1px rgba(122, 169, 255, 0.24) inset;

    ${({ disabled }): RuleSet | string =>
      !disabled
        ? css`
            &:hover {
              color: #adcaff;
              background: linear-gradient(
                180deg,
                rgba(0, 89, 255, 0.2) 0%,
                rgba(0, 89, 255, 0) 100%
              );
              box-shadow:
                0 0 0 2px rgba(122, 169, 255, 0.24) inset,
                0px 1px 3px 0px #0000001a,
                0px 1px 2px 0px #0000000f;
            }

            &:active {
              color: #7aa9ff;
              background:
                0 0 0 2px rgba(122, 169, 255, 0.24) inset,
                linear-gradient(180deg, rgba(0, 89, 255, 0.2) 0%, rgba(0, 89, 255, 0) 100%);
            }
          `
        : ''}

    &:disabled {
      color: #7aa9ff;
      opacity: 0.4;
      background: rgba(0, 89, 255, 0.16);
    }
  }
`;

const StyledButtonTertiary = styled(StyledButtonBase)`
  & {
    color: ${getTheme('webNeutral', '_300')};
    background: rgba(188, 197, 214, 0.04);
    box-shadow: 0 0 0 1px rgba(188, 197, 214, 0.24) inset;

    svg * {
      fill: ${getTheme('webNeutral', '_300')};
    }

    ${({ disabled, theme }): RuleSet | string =>
      !disabled
        ? css`
            &:hover {
              background: rgba(188, 197, 214, 0.06);
              box-shadow:
                0 0 0 2px rgba(188, 197, 214, 0.24) inset,
                0px 1px 3px 0px rgba(0, 0, 0, 0.1),
                0px 1px 2px 0px rgba(0, 0, 0, 0.06);
              svg * {
                fill: ${theme.webNeutral._100};
              }
            }
            &:active {
              color: ${theme.webNeutral._100};
              box-shadow:
                0 0 0 1px rgba(188, 197, 214, 0.24) inset,
                0px 0px 16px 0px rgba(255, 255, 255, 0.04),
                0px 0px 0px 4px rgba(255, 255, 255, 0.04),
                0px 1px 3px 0px rgba(0, 0, 0, 0.1),
                0px 1px 2px 0px rgba(0, 0, 0, 0.06);
              svg * {
                fill: ${theme.webNeutral._100};
              }
            }
          `
        : ''}
  }
`;

const StyledButtonTertiarySmall = styled(StyledButtonTertiary)`
  & {
    color: ${getTheme('webNeutral', '_300')};
    padding: 8px 36px;
    border-radius: 12px;
    border: 1px solid rgba(188, 197, 214, 0.16);
    background: rgba(188, 197, 214, 0.08);

    svg * {
      fill: ${getTheme('webNeutral', '_300')};
    }

    ${({ disabled, theme }): RuleSet | string =>
      !disabled
        ? css`
            &:hover {
              color: ${theme.webNeutral._100};
              box-shadow: 0 0 0 1px rgba(188, 197, 214, 0.16) inset;
              background: rgba(188, 197, 214, 0.08);
              svg * {
                fill: ${theme.webNeutral._100};
              }
            }
            &:active {
              color: ${theme.webNeutral._100};
              box-shadow: 0 0 0 1px rgba(188, 197, 214, 0.16) inset;
              svg * {
                fill: ${theme.webNeutral._100};
              }
            }
          `
        : ''}
  }
`;

const StyledButtonQuaternary = styled(StyledButtonBase)`
  & {
    outline: 1px solid rgba(188, 197, 214, 0.16);
    background: rgba(188, 197, 214, 0.04);
    border-radius: 8px;
    border: 1px solid #212429;

    &:hover {
      color: #fff;
      background: rgba(255, 255, 255, 0.08);
    }

    &:active {
      color: #fff;
      background: rgba(255, 255, 255, 0.08);
    }
  }
`;

const StyledButtonQuinary = styled(StyledButtonBase)`
  & {
    color: #adcaff;
    outline: 1px solid #0a1b39;
    background: rgba(0, 89, 255, 0.05);
    border-radius: 8px;
    border: 1px solid #212429;

    &:hover {
      color: #adcaff;
      background: rgba(255, 255, 255, 0.08);
    }

    &:active {
      color: #adcaff;
      background: rgba(255, 255, 255, 0.08);
    }
  }
`;

export const WebButton: React.FC<WebButtonProps> = ({
  buttonRef,
  figure,
  textType = 'title4',
  children,
  fixed,
  ...rest
}): ReactElement => {
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
    case 'quinary':
      StyledComponent = StyledButtonQuinary;
      break;
    case 'primary':
    default:
      StyledComponent = StyledButtonPrimary;
  }

  const isRightButton = 'text' in rest && rest.rightIcon === 'chevronRight';

  const isFixed = fixed || rest.size === 'small';

  return (
    <StyledComponent ref={buttonRef} fixed={isFixed} {...rest}>
      {'text' in rest ? (
        <Row style={{ gap: 4, alignItems: 'center', justifyContent: 'space-between' }}>
          {isRightButton && <View style={{ width: 12 }} />}
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
