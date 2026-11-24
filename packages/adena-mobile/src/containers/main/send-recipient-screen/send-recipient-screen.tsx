import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { ReactElement, useEffect, useState } from 'react';

import { SendRecipientPage } from '../../../components/pages';
import { useContainer } from '../../../di/container-provider';
import { useWalletSnapshot } from '../../../hooks/use-wallet-snapshot';
import { MainStackParamList } from '../../../navigation/types';

export const SendRecipientScreen = ({ navigation, route }: NativeStackScreenProps<MainStackParamList, 'SendRecipient'>): ReactElement => {
  const tokenId = route.params?.tokenId;
  const scannedAddress = route.params?.scannedAddress;
  const { accountService, chainRegistry, addressBookService } = useContainer();
  const { accounts, account: current, network } = useWalletSnapshot();
  const [query, setQuery] = useState('');

  const [appliedScan, setAppliedScan] = useState<string>();

  // The scanner writes its result onto this route; apply it once, then clear it so a repeat scan applies again.
  if (scannedAddress !== appliedScan) {
    setAppliedScan(scannedAddress);

    if (scannedAddress) {
      setQuery(scannedAddress);
    }
  }

  useEffect(() => {
    if (scannedAddress) {
      navigation.setParams({ scannedAddress: undefined });
    }
  }, [navigation, scannedAddress]);

  const trimmed = query.trim();
  const valid = trimmed.length > 0 && chainRegistry.forNetwork(network).isValidAddress(trimmed, network);
  const own = accounts.find(item => accountService.getAddress(item, network) === trimmed);
  const saved = addressBookService.findByAddress(trimmed);

  const handleSelectRecipient = (toAddress: string): void => navigation.navigate('SendAmount', { toAddress, tokenId });

  const handleScan = (): void => navigation.navigate('QrScanner', { returnKey: route.key });

  return (
    <SendRecipientPage
      query={query}
      onChangeQuery={setQuery}
      onScan={handleScan}
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
