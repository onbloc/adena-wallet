import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { ReactElement, useState } from 'react';

import { SendRecipientPage } from '../../../components/pages';
import { useContainer } from '../../../di/container-provider';
import { useWalletSnapshot } from '../../../hooks/use-wallet-snapshot';
import { MainStackParamList } from '../../../navigation/types';

export const SendRecipientScreen = ({ navigation, route }: NativeStackScreenProps<MainStackParamList, 'SendRecipient'>): ReactElement => {
  const tokenId = route.params?.tokenId;
  const { accountService, chainRegistry, addressBookService } = useContainer();
  const { accounts, account: current, network } = useWalletSnapshot();
  const [query, setQuery] = useState('');
  const trimmed = query.trim();
  const valid = trimmed.length > 0 && chainRegistry.forNetwork(network).isValidAddress(trimmed, network);
  const own = accounts.find(item => accountService.getAddress(item, network) === trimmed);
  const saved = addressBookService.findByAddress(trimmed);

  const handleSelectRecipient = (toAddress: string): void => navigation.navigate('SendAmount', { toAddress, tokenId });

  return (
    <SendRecipientPage
      query={query}
      onChangeQuery={setQuery}
      result={valid ? { key: trimmed, label: saved?.name ?? own?.name ?? 'Address', address: trimmed } : undefined}
      error={trimmed.length > 0 && !valid ? `Enter a valid ${network.chainName} address.` : undefined}
      addressBook={addressBookService.getEntriesFor(network).map(entry => ({ key: entry.id, label: entry.name, address: entry.address }))}
      myAccounts={accounts
        .filter(item => item.id !== current?.id)
        .map(item => ({ key: item.id, label: item.name, address: accountService.getAddress(item, network) }))}
      onSelectRecipient={handleSelectRecipient}
      onClose={navigation.goBack}
    />
  );
};
