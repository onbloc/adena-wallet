import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { ReactElement } from 'react';
import { Share } from 'react-native';

import { ReceivePage } from '../../../components/pages';
import { useCopyToClipboard } from '../../../hooks/use-copy-to-clipboard';
import { useWalletSnapshot } from '../../../hooks/use-wallet-snapshot';
import { MainStackParamList } from '../../../navigation/types';

export const ReceiveScreen = ({ navigation }: NativeStackScreenProps<MainStackParamList, 'Receive'>): ReactElement => {
  const { account, address, network } = useWalletSnapshot();
  const copy = useCopyToClipboard();

  const handleCopy = (): void => copy(address);

  const handleShare = (): Promise<{ action: string; activityType: string | undefined }> => Share.share({ message: address });

  return (
    <ReceivePage
      accountName={account?.name ?? ''}
      address={address}
      networkName={network.networkName}
      onCopy={handleCopy}
      onShare={handleShare}
      onClose={navigation.goBack}
    />
  );
};
