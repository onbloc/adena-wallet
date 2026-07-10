import { Row, WebCheckBox, WebText } from '@components/atoms';
import { formatHdPath } from 'adena-module';
import React from 'react';
import { useTheme } from 'styled-components';
import { StyledSelectAccountBoxItem } from './select-account-box-item.styles';
import { AccountInfo } from './select-account-box.types';

const SelectAccountBoxItem: React.FC<{
  account: AccountInfo;
  select: (address: string) => void;
}> = ({ account, select }) => {
  const theme = useTheme();
  const { address, hdPath, accountIndex, changeIndex, index, selected, stored, locked } = account;

  const derivationPath = formatHdPath({
    account: accountIndex ?? 0,
    change: changeIndex ?? 0,
    addressIndex: hdPath,
  });

  // Already-registered accounts (stored) and accounts selected via the
  // derivation-path editor (locked) are checked and cannot be toggled here.
  const checkboxDisabled = stored || locked;

  return (
    <StyledSelectAccountBoxItem key={index}>
      <Row style={{ columnGap: 8 }}>
        <WebText type='body5'>{address}</WebText>
        <WebText type='body5' color={theme.webNeutral._700}>
          {derivationPath}
        </WebText>
      </Row>
      {checkboxDisabled ? (
        <WebCheckBox checked={stored || locked || selected} disabled />
      ) : (
        <WebCheckBox checked={selected} onClick={(): void => select(address)} />
      )}
    </StyledSelectAccountBoxItem>
  );
};

export default SelectAccountBoxItem;
