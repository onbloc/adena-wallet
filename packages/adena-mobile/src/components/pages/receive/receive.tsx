import React, { ReactElement } from 'react';
import { useWindowDimensions, View } from 'react-native';

import { Badge, Button, Text } from '../../atoms';
import { QrCode, SheetFrame } from '../../molecules';
import { useStyles } from './receive.styles';

export interface ReceivePageProps {
  accountName: string;
  address: string;
  networkName: string;
  onCopy: () => void;
  onShare: () => void;
  onClose: () => void;
  onOpenNetworks?: () => void;
  onScan?: () => void;
}

// Presented as a native form sheet (see the Receive route). The sheet does not scroll, so short screens get a smaller code to keep every action visible.
const COMPACT_HEIGHT = 720;

export const ReceivePage = ({ accountName, address, networkName, onCopy, onShare, onClose, onOpenNetworks, onScan }: ReceivePageProps): ReactElement => {
  const styles = useStyles();
  const { height } = useWindowDimensions();
  const compact = height < COMPACT_HEIGHT;

  return (
    <SheetFrame title='Receive' onClose={onClose}>
      <View style={styles.body}>
        <View style={[styles.qr, compact && styles.qrCompact]}>
          <QrCode value={address} size={compact ? 136 : 180} />
        </View>
        <View style={styles.identity}>
          <Text variant='row' numberOfLines={1} style={styles.accountName}>{accountName}</Text>
          {onOpenNetworks
            ? <Button label={networkName} tone='secondary' size='compact' fullWidth={false} onPress={onOpenNetworks} />
            : <Badge label={networkName} />}
        </View>
        <View style={styles.addressBox}>
          <Text variant='meta' color='secondary' align='center'>Wallet address</Text>
          <Text variant='body' align='center' tabular selectable>{address}</Text>
        </View>
        <View style={styles.actions}>
          <Button label='Copy address' leadingIcon='copy' fullWidth={false} style={styles.action} onPress={onCopy} />
          <Button label='Share' tone='secondary' fullWidth={false} style={styles.action} onPress={onShare} />
        </View>
        <Text variant='meta' color='secondary' align='center'>{`Only send ${networkName} assets to this address.`}</Text>
        {onScan && <Button label='Scan a QR code' leadingIcon='scan' tone='secondary' size='compact' onPress={onScan} />}
      </View>
    </SheetFrame>
  );
};
