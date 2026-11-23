import React, { ReactElement } from 'react';
import { View } from 'react-native';

import { Badge, Button, Text } from '../../atoms';
import { BottomSheet, QrCode } from '../../molecules';
import { styles } from './receive.styles';

export interface ReceivePageProps {
  accountName: string;
  address: string;
  networkName: string;
  onCopy: () => void;
  onShare: () => void;
  onClose: () => void;
}

export const ReceivePage = ({ accountName, address, networkName, onCopy, onShare, onClose }: ReceivePageProps): ReactElement => (
  <BottomSheet visible title='Receive' onClose={onClose}>
    <View style={styles.qr}>
      <QrCode value={address} />
    </View>
    <View style={styles.identity}>
      <Text variant='row'>{accountName}</Text>
      <Badge label={networkName} />
    </View>
    <Text variant='meta' color='secondary' selectable>{address}</Text>
    <View style={styles.actions}>
      <Button label='Copy address' leadingIcon='copy' size='compact' style={styles.action} onPress={onCopy} />
      <Button label='Share' tone='secondary' size='compact' style={styles.action} onPress={onShare} />
    </View>
    <Text variant='meta' color='secondary' align='center'>{`Only send ${networkName} assets to this address.`}</Text>
  </BottomSheet>
);
