import React from 'react';
import styled, { CSSProp, CSSProperties } from 'styled-components';
import Text from '@components/text';
import theme from '@styles/theme';

type WarningKeyType =
  | 'revealPassword'
  | 'revealPrivate'
  | 'approachPassword'
  | 'approachPrivate'
  | 'approachNetwork'
  | 'addingNetwork';

interface TextProperty {
  title?: string;
  subTitle?: string;
}

interface WarningBoxStyleProps {
  margin?: CSSProperties['margin'];
  padding?: CSSProperties['padding'];
}

export interface WarningBoxProps extends WarningBoxStyleProps {
  type: WarningKeyType;
}

const warningType: { [key in WarningKeyType]: TextProperty } = {
  revealPassword: {
    title: 'Approach with caution!',
    subTitle:
      'You’re about to reveal your seed phrase. Please carefully review the checklist below.',
  },
  revealPrivate: {
    subTitle:
      'Your seed phrase is the only way to recover your wallet. Keep it somewhere safe and secret.',
  },
  approachPassword: {
    title: 'Approach with caution!',
    subTitle:
      'You’re about to reveal your private key. Please carefully review the checklist below.',
  },
  approachPrivate: {
    subTitle:
      'Do not share your private key! Anyone with your private key will have full control of your wallet.',
  },
  approachNetwork: {
    title: 'Approach with caution!',
    subTitle:
      'A malicious network provider can lie about the state of the blockchain.\nOnly add custom networks you trust.',
  },
  addingNetwork: {
    subTitle:
      'You’re adding an unverified network.\nAdena doesn’t verify custom networks.\nOnly add networks that you trust.',
  },
};

const WarningBox = ({ type, margin, padding }: WarningBoxProps): JSX.Element => {
  return (
    <Wrapper margin={margin} padding={padding}>
      {warningType[type].title && (
        <Text type='header7' color={theme.color.red[6]}>
          {warningType[type].title}
        </Text>
      )}
      {warningType[type].subTitle && (
        <Text type='body2Reg' color={'rgba(231, 50, 59, 1)'}>
          {warningType[type].subTitle}
        </Text>
      )}
    </Wrapper>
  );
};

const Wrapper = styled.div<WarningBoxStyleProps>`
  ${({ theme }): CSSProp => theme.mixins.flexbox('column', 'flex-start', 'space-between')};
  width: 100%;
  padding: ${(props): CSSProperties['padding'] => props.padding ?? '14px 16px'};
  gap: 11px;
  border-radius: 18px;
  background-color: rgba(231, 50, 59, 0.1);
  border: 1px solid rgba(231, 50, 59, 0.1);
  margin: ${(props): CSSProperties['margin'] => props.margin};
`;

export default WarningBox;
