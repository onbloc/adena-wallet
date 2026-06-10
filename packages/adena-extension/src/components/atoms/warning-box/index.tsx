import React from 'react';
import styled, { CSSProperties, useTheme } from 'styled-components';

import { Text } from '@components/atoms';
import mixins from '@styles/mixins';

type WarningKeyType =
  | 'revealPassword'
  | 'revealPrivate'
  | 'approachPassword'
  | 'approachPrivate'
  | 'approachNetwork'
  | 'addingNetwork'
  | 'sessionRevoke';

type WarningTone = 'red' | 'warning';

interface TextProperty {
  title?: string;
  subTitle?: string;
  tone?: WarningTone;
}

interface WarningBoxStyleProps {
  margin?: CSSProperties['margin'];
  padding?: CSSProperties['padding'];
  $tone?: WarningTone;
}

export interface WarningBoxProps extends Omit<WarningBoxStyleProps, '$tone'> {
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
  sessionRevoke: {
    tone: 'warning',
    subTitle:
      'Export your private key to continue using this account as a standard account after it’s revoked or expired.',
  },
};

const SessionRevokeIcon = (): JSX.Element => (
  <svg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 14 14' fill='none'>
    <g clipPath='url(#session-revoke-warning-icon)'>
      <path
        d='M7 7.83594V9.5026'
        stroke='#FB923C'
        strokeWidth='2'
        strokeLinecap='round'
        strokeLinejoin='round'
      />
      <path
        d='M7.41732 4.5026C7.41732 4.73272 7.23077 4.91927 7.00065 4.91927C6.77053 4.91927 6.58398 4.73272 6.58398 4.5026C6.58398 4.27249 6.77053 4.08594 7.00065 4.08594C7.23077 4.08594 7.41732 4.27249 7.41732 4.5026Z'
        stroke='#FB923C'
      />
      <path
        d='M13.0423 7.0026C13.0423 10.3393 10.3374 13.0443 7.00065 13.0443C3.66393 13.0443 0.958984 10.3393 0.958984 7.0026C0.958984 3.66588 3.66393 0.960938 7.00065 0.960938C10.3374 0.960938 13.0423 3.66588 13.0423 7.0026Z'
        stroke='#FB923C'
        strokeWidth='1.5'
        strokeLinecap='round'
        strokeLinejoin='round'
      />
    </g>
    <defs>
      <clipPath id='session-revoke-warning-icon'>
        <rect width='14' height='14' fill='white' />
      </clipPath>
    </defs>
  </svg>
);

export const WarningBox = ({ type, margin, padding }: WarningBoxProps): JSX.Element => {
  const theme = useTheme();
  const tone: WarningTone = warningType[type].tone ?? 'red';
  const isSessionRevoke = type === 'sessionRevoke';
  const titleColor = tone === 'warning' ? '#FB923C' : theme.red.a;
  const bodyColor = tone === 'warning' ? '#FB923C' : 'rgba(231, 50, 59, 1)';

  return (
    <Wrapper margin={margin} padding={padding} $tone={tone} $isSessionRevoke={isSessionRevoke}>
      {isSessionRevoke && (
        <IconWrapper>
          <SessionRevokeIcon />
        </IconWrapper>
      )}
      {warningType[type].title && (
        <Text type='header7' color={titleColor}>
          {warningType[type].title}
        </Text>
      )}
      {warningType[type].subTitle && (
        isSessionRevoke ? (
          <SessionRevokeText>{warningType[type].subTitle}</SessionRevokeText>
        ) : (
          <Text type='body2Reg' color={bodyColor}>
            {warningType[type].subTitle}
          </Text>
        )
      )}
    </Wrapper>
  );
};

const Wrapper = styled.div<WarningBoxStyleProps & { $isSessionRevoke?: boolean }>`
  ${({ $isSessionRevoke }): ReturnType<typeof mixins.flex> =>
    $isSessionRevoke
      ? mixins.flex({ direction: 'row', align: 'flex-start', justify: 'flex-start' })
      : mixins.flex({ align: 'flex-start', justify: 'space-between' })};
  width: 100%;
  padding: ${(props): CSSProperties['padding'] =>
    props.padding ?? (props.$isSessionRevoke ? '12px 20px' : '14px 16px')};
  gap: ${({ $isSessionRevoke }): string => ($isSessionRevoke ? '8px' : '11px')};
  border-radius: ${({ $isSessionRevoke }): string => ($isSessionRevoke ? '8px' : '18px')};
  background-color: ${({ $tone }): string =>
    $tone === 'warning' ? 'rgba(251, 146, 60, 0.1)' : 'rgba(231, 50, 59, 0.1)'};
  border: 1px solid
    ${({ $tone }): string =>
      $tone === 'warning' ? 'rgba(251, 146, 60, 0.05)' : 'rgba(231, 50, 59, 0.1)'};
  margin: ${(props): CSSProperties['margin'] => props.margin};
`;

const IconWrapper = styled.span`
  display: inline-flex;
  width: 14px;
  height: 14px;
  margin-top: 4px;
  flex-shrink: 0;
`;

const SessionRevokeText = styled.div`
  color: #fb923c;
  font-family: Inter, sans-serif;
  font-size: 14px;
  font-style: normal;
  font-weight: 400;
  line-height: 21px;
  white-space: pre-wrap;
`;
