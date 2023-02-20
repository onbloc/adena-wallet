import React from 'react';
import styled, { CSSProperties } from 'styled-components';
import Text from '@components/text';
import theme from '@styles/theme';

type WarningKeyType = 'revealPassword' | 'revealPrivate' | 'approachPassword' | 'approachPrivate';

interface TextProperty {
  title?: string;
  subTitle?: string;
}

interface WarningBoxStyleProps {
  margin?: CSSProperties['margin'];
  padding?: CSSProperties['padding'];
}

interface WarningBoxProps extends WarningBoxStyleProps {
  type: WarningKeyType;
}

const warningType: { [key in WarningKeyType]: TextProperty } = {
  revealPassword: {
    title: 'Approach with caution!',
    subTitle:
      'You’re about to reveal your seed phrase.\nPlease carefully review the checklist\nbelow.',
  },
  revealPrivate: {
    subTitle:
      'Your seed phrase is the only way to\nrecover your wallet. Keep it somewhere\nsafe and secret.',
  },
  approachPassword: {
    title: 'Approach with caution!',
    subTitle:
      'You’re about to reveal your private key.\nPlease carefully review the checklist\nbelow.',
  },
  approachPrivate: {
    subTitle:
      'Do not share your private key! Anyone\nwith your private key will have full control\nof your wallet.',
  },
};

const WarningBox = ({ type, margin, padding }: WarningBoxProps) => {
  return (
    <Wrapper margin={margin} padding={padding}>
      {warningType[type].title && (
        <Text type='header7' color={theme.color.red[6]}>
          {warningType[type].title}
        </Text>
      )}
      {warningType[type].subTitle && (
        <Text type='body2Reg' color={theme.color.red[6]}>
          {warningType[type].subTitle}
        </Text>
      )}
    </Wrapper>
  );
};

const Wrapper = styled.div<WarningBoxStyleProps>`
  ${({ theme }) => theme.mixins.flexbox('column', 'flex-start', 'space-between')};
  width: 100%;
  padding: ${(props) => props.padding};
  gap: 11px;
  border-radius: 18px;
  background-color: rgba(231, 50, 59, 0.1);
  border: 1px solid rgba(231, 50, 59, 0.1);
  margin: ${(props) => props.margin};
`;

export default WarningBox;
