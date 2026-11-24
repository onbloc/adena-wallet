import React, { ReactElement } from 'react';

import { shortenAddress } from '../../../utils/address';
import { Avatar, IconButton } from '../../atoms';
import { InlineAlert, ListRow, RecipientField, Screen, SectionLabel, TopBar } from '../../molecules';

export interface RecipientItem {
  key: string;
  label: string;
  address: string;
}

export interface SendRecipientPageProps {
  query: string;
  onChangeQuery: (value: string) => void;
  onScan: () => void;
  result?: RecipientItem;
  error?: string;
  addressBook: RecipientItem[];
  myAccounts: RecipientItem[];
  onSelectRecipient: (address: string) => void;
  onClose: () => void;
}

export const SendRecipientPage = ({ query, onChangeQuery, onScan, result, error, addressBook, myAccounts, onSelectRecipient, onClose }: SendRecipientPageProps): ReactElement => {
  const handleListRowPress = (): void => {
    if (result) {
      onSelectRecipient(result.address);
    }
  };

  return (
    <Screen
      header={(
        <TopBar
          title='Send to'
          trailing={<IconButton icon='close' variant='primary' accessibilityLabel='Close' size={36} onPress={onClose} />}
        />
      )}
    >
      <RecipientField value={query} onChangeText={onChangeQuery} onScan={onScan} testID='recipient-search' />
      {error && <InlineAlert tone='error' title={error} />}
      {result && (
        <>
          <SectionLabel label='Results' />
          <ListRow
            testID='recipient-result'
            leading={<Avatar name={result.label} />}
            label={result.label}
            description={shortenAddress(result.address)}
            onPress={handleListRowPress}
          />
        </>
      )}
      {addressBook.length > 0 && (
        <>
          <SectionLabel label='Address book' />
          {addressBook.map((entry) => {
            const handlePress = (): void => onSelectRecipient(entry.address);

            return (
              <ListRow
                key={entry.key}
                leading={<Avatar name={entry.label} />}
                label={entry.label}
                description={shortenAddress(entry.address)}
                onPress={handlePress}
              />
            );
          })}
        </>
      )}
      {myAccounts.length > 0 && (
        <>
          <SectionLabel label='My accounts' />
          {myAccounts.map((account) => {
            const handlePress = (): void => onSelectRecipient(account.address);

            return (
              <ListRow
                key={account.key}
                leading={<Avatar name={account.label} />}
                label={account.label}
                description={shortenAddress(account.address)}
                onPress={handlePress}
              />
            );
          })}
        </>
      )}
    </Screen>
  );
};
