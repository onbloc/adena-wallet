import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { ReactElement } from 'react';
import { Share } from 'react-native';

import { ReceivePage } from '../../../components/pages';
import { useCopyToClipboard } from '../../../hooks/use-copy-to-clipboard';
import { useWalletSnapshot } from '../../../hooks/use-wallet-snapshot';
import { MainStackParamList } from '../../../navigation/types';
import { useToastStore } from '../../../stores/toast.store';

export const ReceiveScreen = ({ navigation }: NativeStackScreenProps<MainStackParamList, 'Receive'>): ReactElement => {
  const { account, address, network } = useWalletSnapshot();
  const copy = useCopyToClipboard();
  const showToast = useToastStore(state => state.show);

  // Chain plus network, as on Home: "Mainnet" alone is ambiguous across chains.
  const networkLabel = `${network.chainName} ${network.networkName}`;

  const handleCopy = (): void => copy(address);

  const handleShare = (): void => {
    Share.share({ message: address }).catch(() => showToast('Couldn’t open the share sheet', 'error'));
  };

  // The sheet is replaced rather than stacked under the next screen.
  const handleOpenNetworks = (): void => navigation.replace('Networks');

  const handleScan = (): void => navigation.replace('QrScanner');

  return (
    <ReceivePage
      accountName={account?.name ?? ''}
      address={address}
      networkName={networkLabel}
      onCopy={handleCopy}
      onShare={handleShare}
      onClose={navigation.goBack}
      onOpenNetworks={handleOpenNetworks}
      onScan={handleScan}
    />
  );
};
