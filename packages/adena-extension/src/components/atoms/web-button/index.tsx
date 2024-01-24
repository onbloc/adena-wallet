import { ButtonHTMLAttributes, ReactElement, ReactNode } from 'react';
import styled from 'styled-components';

import IconRight from '@assets/web/chevron-right.svg';

import { WebImg } from '../web-img';
import { WebText } from '../web-text';
import { Row } from '../base';

type WebButtonProps = {
  size: 'large' | 'small';
  figure: 'primary' | 'secondary' | 'tertiary';
} & (
  | { text: string; rightIcon?: 'chevronRight' }
  | {
      children: ReactNode;
    }
) &
  ButtonHTMLAttributes<HTMLButtonElement>;

const StyledButtonBase = styled.button<{ size: 'large' | 'small' }>`
  cursor: pointer;
  border: transparent;
  border-radius: 14px;
  padding: ${({ size }): string => (size === 'large' ? '12px 16px 16px' : '8px 24px')};
  display: flex;
  flex-direction: row;

  :disabled {
    opacity: 0.4;
  }
`;

const StyledButtonPrimary = styled(StyledButtonBase)`
  outline: 1px solid rgba(255, 255, 255, 0.4);
  background: linear-gradient(180deg, #0059ff 0%, #004bd6 100%);

  :hover {
    outline: 2px solid rgba(255, 255, 255, 0.4);
    background: linear-gradient(180deg, #0059ff 0%, #004bd6 100%);
    box-shadow: 0px 0px 24px 0px rgba(0, 89, 255, 0.32), 0px 1px 3px 0px rgba(0, 0, 0, 0.1),
      0px 1px 2px 0px rgba(0, 0, 0, 0.06);
  }

  :active {
    outline: 2px solid rgba(255, 255, 255, 0.4);
    background: linear-gradient(180deg, #0059ff 0%, #004bd6 100%);
    box-shadow: 0px 0px 24px 0px rgba(0, 89, 255, 0.32), 0px 0px 0px 3px rgba(0, 89, 255, 0.16),
      0px 1px 3px 0px rgba(0, 0, 0, 0.1), 0px 1px 2px 0px rgba(0, 0, 0, 0.06);
  }
`;

const StyledButtonSecondary = styled(StyledButtonBase)`
  outline: 1px solid rgba(122, 169, 255, 0.24);
  background: rgba(0, 89, 255, 0.16);

  :hover {
    outline: 2px solid rgba(122, 169, 255, 0.24);
    background: rgba(0, 89, 255, 0.2);
    box-shadow: 0px 1px 3px 0px rgba(0, 0, 0, 0.1), 0px 1px 2px 0px rgba(0, 0, 0, 0.06);
  }

  :active {
    outline: 2px solid rgba(122, 169, 255, 0.24);
    background: rgba(0, 89, 255, 0.2);
  }
`;

const StyledButtonTertiary = styled(StyledButtonBase)`
  outline: 1px solid rgba(188, 197, 214, 0.16);
  background: rgba(188, 197, 214, 0.04);

  :hover {
    outline: 2px solid rgba(188, 197, 214, 0.16);
    background: rgba(188, 197, 214, 0.06);
  }

  :active {
    outline: 1px solid rgba(188, 197, 214, 0.24);
    background: rgba(188, 197, 214, 0.04);
    box-shadow: 0px 0px 16px 0px rgba(255, 255, 255, 0.04),
      0px 0px 0px 4px rgba(255, 255, 255, 0.04), 0px 1px 3px 0px rgba(0, 0, 0, 0.1),
      0px 1px 2px 0px rgba(0, 0, 0, 0.06);
  }
`;

export const WebButton = ({ figure, children, ...rest }: WebButtonProps): ReactElement => {
  let StyledComponent;
  switch (figure) {
    case 'secondary':
      StyledComponent = StyledButtonSecondary;
      break;
    case 'tertiary':
      StyledComponent = StyledButtonTertiary;
      break;

    // primary
    default:
      StyledComponent = StyledButtonPrimary;
  }

  return (
    <StyledComponent {...rest}>
      {'text' in rest ? (
        <Row>
          <WebText type='title4'>{rest.text}</WebText>
          {rest.rightIcon === 'chevronRight' && <WebImg src={IconRight} size={24} />}
        </Row>
      ) : (
        children
      )}
    </StyledComponent>
  );
};
