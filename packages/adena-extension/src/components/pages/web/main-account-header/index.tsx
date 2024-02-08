import React, { ReactElement, useEffect, useMemo, useState } from 'react';
import styled, { useTheme } from 'styled-components';
import { Account } from 'adena-module';

import { CopyIconButton, Pressable, Row, WebImg, WebText } from '@components/atoms';
import { formatAddress } from '@common/utils/client-utils';
import back from '@assets/web/chevron-left.svg';

const StyledContainer = styled(Row)`
  width: 100%;
  justify-content: space-between;
`;

const StyledAccountRow = styled(Row)`
  gap: 8px;
`;

const StyledBlank = styled(Row)`
  width: 24px;
`;

export type WebMainAccountHeaderProps = {
  account: Account | null;
  onClickGoBack: () => void;
};

export const WebMainAccountHeader = ({
  account,
  onClickGoBack,
}: WebMainAccountHeaderProps): ReactElement => {
  const theme = useTheme();
  const [address, setAddress] = useState<string>('');

  const addressStr = useMemo(() => {
    if (address === '') {
      return '';
    }
    return `(${formatAddress(address, 4)})`;
  }, [address]);

  useEffect(() => {
    if (account) {
      account.getAddress('g').then(setAddress);
    }
  }, [account]);

  return (
    <StyledContainer>
      <Pressable
        onClick={onClickGoBack}
        style={{ padding: 4, backgroundColor: theme.webInput._100, borderRadius: 16 }}
      >
        <WebImg src={back} size={24} />
      </Pressable>
      {account && (
        <StyledAccountRow>
          <WebText
            type='title4'
          >
            {account.name}
          </WebText>
          <WebText
            type='body4'
            color={theme.webNeutral._600}
            style={{ lineHeight: '22px' }}
          >
            {addressStr}
          </WebText>
          <CopyIconButton size={20} copyText={address} />
        </StyledAccountRow>
      )}
      <StyledBlank />
    </StyledContainer >
  );
};
