import React, { ButtonHTMLAttributes, ReactElement, ReactNode } from 'react';
import styled from 'styled-components';

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
  border-radius: 14px;
  padding: ${({ size }): string => (size === 'large' ? '12px 16px 16px' : '8px 16px')};
  display: flex;
  flex-direction: row;
  width: ${({ size }): string => (size === 'full' ? '100%' : 'auto')};
  justify-content: center;
  align-items: center;

  :disabled {
    opacity: 0.4;
  }
`;

const StyledButtonPrimary = styled(StyledButtonBase)`
  color: ${getTheme('webNeutral', '_100')};
  outline: 1px solid rgba(255, 255, 255, 0.4);
  background: linear-gradient(180deg, #0059ff 0%, #004bd6 100%);

  :hover {
    color: ${getTheme('webNeutral', '_100')};
    outline: 2px solid rgba(255, 255, 255, 0.4);
    background: linear-gradient(180deg, #0059ff 0%, #004bd6 100%);
    box-shadow: 0px 0px 24px 0px rgba(0, 89, 255, 0.32), 0px 1px 3px 0px rgba(0, 0, 0, 0.1),
      0px 1px 2px 0px rgba(0, 0, 0, 0.06);
  }

  :active {
    color: ${getTheme('webNeutral', '_100')};
    outline: 2px solid rgba(255, 255, 255, 0.4);
    background: linear-gradient(180deg, #0059ff 0%, #004bd6 100%);
    box-shadow: 0px 0px 24px 0px rgba(0, 89, 255, 0.32), 0px 0px 0px 3px rgba(0, 89, 255, 0.16),
      0px 1px 3px 0px rgba(0, 0, 0, 0.1), 0px 1px 2px 0px rgba(0, 0, 0, 0.06);
  }
`;

const StyledButtonSecondary = styled(StyledButtonBase)`
  color: #ADCAFF;
  outline: 1px solid rgba(122, 169, 255, 0.24);
  background: rgba(0, 89, 255, 0.16);

  :hover {
    color: #ADCAFF;
    outline: 2px solid rgba(122, 169, 255, 0.24);
    background: rgba(0, 89, 255, 0.2);
    box-shadow: 0px 1px 3px 0px rgba(0, 0, 0, 0.1), 0px 1px 2px 0px rgba(0, 0, 0, 0.06);
  }

  :active {
    color: #7AA9FF;
    outline: 2px solid rgba(122, 169, 255, 0.24);
    background: rgba(0, 89, 255, 0.2);
  }
`;

const StyledButtonTertiary = styled(StyledButtonBase)`
  color: ${getTheme('webNeutral', '_300')};
  outline: 1px solid rgba(188, 197, 214, 0.16);
  background: rgba(188, 197, 214, 0.04);

  :hover {
    color: ${getTheme('webNeutral', '_300')};
    outline: 2px solid rgba(188, 197, 214, 0.16);
    background: rgba(188, 197, 214, 0.06);
  }

  :active {
    color: ${getTheme('webNeutral', '_100')};
    outline: 1px solid rgba(188, 197, 214, 0.24);
    background: rgba(188, 197, 214, 0.04);
    box-shadow: 0px 0px 16px 0px rgba(255, 255, 255, 0.04),
      0px 0px 0px 4px rgba(255, 255, 255, 0.04), 0px 1px 3px 0px rgba(0, 0, 0, 0.1),
      0px 1px 2px 0px rgba(0, 0, 0, 0.06);
  }
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

  return (
    <StyledComponent {...rest}>
      {'text' in rest ? (
        <Row style={{ alignItems: 'flex-end' }}>
          <WebText type={textType} style={{ padding: '0 8px' }}>
            {rest.text}
          </WebText>
          {rest.rightIcon === 'chevronRight' && (
            <View style={{ margin: '0 -4px' }}>
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
