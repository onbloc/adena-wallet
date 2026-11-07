import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import React from 'react';
import {Pressable, StyleSheet, View} from 'react-native';

import {useWallet} from '../../core/wallet-context';
import type {MainStackParams} from '../../navigation/types';
import {Body, Button, ListItem, Screen} from '../../ui/components';
import {EditSmallIcon} from '../../ui/icons';

type Props = NativeStackScreenProps<MainStackParams, 'Networks'>;

/**
 * The popup's change-network list: one row per network, a check on the
 * current one, an edit button on each, and "Add Custom Network" below.
 */
export function NetworksScreen({navigation}: Props) {
  const {networks, net, switchNetwork} = useWallet();
  const visible = networks.filter(network => !network.deleted);

  return (
    <Screen
      footer={
        <Button
          testID="network-add"
          variant="secondary"
          title="Add Custom Network"
          onPress={() => navigation.navigate('NetworkEdit')}
        />
      }>
      {visible.length === 0 && <Body muted>No networks available</Body>}
      {visible.map(network => (
        <View key={network.id} style={styles.row}>
          <View style={styles.flex}>
            <ListItem
              title={network.networkName}
              detail={network.chainId}
              selected={network.id === net?.network.id}
              onPress={async () => {
                await switchNetwork(network.id);
                navigation.goBack();
              }}
            />
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Edit ${network.networkName}`}
            hitSlop={8}
            onPress={() => navigation.navigate('NetworkEdit', {id: network.id})}
            style={({pressed}) => [styles.edit, pressed && styles.pressed]}>
            <EditSmallIcon />
          </Pressable>
        </View>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: {flexDirection: 'row', alignItems: 'center', gap: 8},
  flex: {flex: 1},
  edit: {padding: 8},
  pressed: {opacity: 0.6},
});
