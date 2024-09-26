import { Row, WebCheckBox, WebText } from '@components/atoms';
import React from 'react';
import { useTheme } from 'styled-components';
import { StyledSelectAccountBoxItem } from './select-account-box-item.styles';
import { AccountInfo } from './select-account-box.types';

const SelectAccountBoxItem: React.FC<{
  account: AccountInfo;
  select: (address: string) => void;
}> = ({ account, select }) => {
  const theme = useTheme();
  const { address, hdPath, index, selected, stored } = account;

  return (
    <StyledSelectAccountBoxItem key={index}>
      <Row style={{ columnGap: 8 }}>
        <WebText type='body5'>{address}</WebText>
        <WebText type='body5' color={theme.webNeutral._700}>{`m/44'/118'/0'/0/${hdPath}`}</WebText>
      </Row>
      {stored ? (
        <WebCheckBox checked disabled />
      ) : (
        <WebCheckBox checked={selected} onClick={(): void => select(address)} />
      )}
    </StyledSelectAccountBoxItem>
  );
};

export default SelectAccountBoxItem;
