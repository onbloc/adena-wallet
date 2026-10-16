import EtcIcon from '@assets/etc.svg';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import React, {useLayoutEffect} from 'react';
import {
  ActionSheetIOS,
  Alert,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

import {useNftCollections, useNftMetadata} from '../../core/use-nft';
import type {MainStackParams} from '../../navigation/types';
import {Button, Screen} from '../../ui/components';
import {NftImage} from '../../ui/nft';
import {colors, colorTokens, fonts} from '../../ui/theme';

type Props = NativeStackScreenProps<MainStackParams, 'NftAsset'>;

/** The extension's NFT detail: image, Send, description and attributes. */
export function NftAssetScreen({navigation, route}: Props) {
  const {token} = route.params;
  const nft = useNftCollections();
  const {data: metadata} = useNftMetadata(token);
  const {width} = useWindowDimensions();
  // A token the account only operates (e.g. a GNFT staked in GnoSwap) cannot
  // be sent by it.
  const transferable = token.isOwned !== false;
  const pinned = nft.pinned.includes(token.packagePath);
  const visible =
    nft.collections.find(item => item.packagePath === token.packagePath)
      ?.display ?? false;

  const openMenu = () => {
    const pinLabel = pinned ? 'Unpin Collection' : 'Pin Collection';
    const showLabel = visible ? 'Hide Collection' : 'Show Collection';
    const run = (choice: number) => {
      if (choice === 0) {
        nft.togglePin(token.packagePath);
      } else if (choice === 1) {
        nft.setDisplay(token.packagePath, !visible);
      }
    };
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {options: [pinLabel, showLabel, 'Cancel'], cancelButtonIndex: 2},
        run,
      );
    } else {
      Alert.alert(token.name, undefined, [
        {text: pinLabel, onPress: () => run(0)},
        {text: showLabel, onPress: () => run(1)},
        {text: 'Cancel', style: 'cancel'},
      ]);
    }
  };

  // Every render: the menu reads the current pin and visibility.
  useLayoutEffect(() => {
    navigation.setOptions({
      title: `${token.name} #${token.tokenId}`,
      // MenuButton holds no state, so a new function each render costs nothing.
      // eslint-disable-next-line react/no-unstable-nested-components
      headerRight: () => <MenuButton onPress={openMenu} />,
    });
  });

  return (
    <Screen>
      <View style={[styles.image, {height: width - 40}]}>
        <NftImage token={token} />
      </View>
      {transferable ? (
        <Button
          title="Send"
          testID="nft-send"
          onPress={() => navigation.navigate('NftSend', {token})}
        />
      ) : (
        <Button
          title="Staked GNFTs can’t be transferred"
          variant="dark"
          disabled
          onPress={() => undefined}
        />
      )}
      {metadata && (
        <>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Description</Text>
            <Text style={styles.description}>{metadata.description}</Text>
          </View>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Attributes</Text>
            <View style={styles.attributes}>
              {(metadata.attributes ?? []).map((trait, index) => (
                <View key={index} style={styles.trait}>
                  <Text style={styles.traitType}>{trait.traitType}</Text>
                  <Text style={styles.traitValue}>{String(trait.value)}</Text>
                </View>
              ))}
            </View>
          </View>
        </>
      )}
    </Screen>
  );
}

function MenuButton({onPress}: {onPress: () => void}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Collection options"
      hitSlop={10}
      onPress={onPress}>
      <EtcIcon width={24} height={24} />
    </Pressable>
  );
}

const {neutral} = colorTokens;

const styles = StyleSheet.create({
  image: {borderRadius: 8, overflow: 'hidden'},
  section: {gap: 8},
  sectionTitle: {...fonts.body1Bold, color: colors.text},
  description: {...fonts.body2Reg, color: colors.textMuted},
  attributes: {flexDirection: 'row', flexWrap: 'wrap', gap: 8},
  trait: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: neutral._9,
  },
  traitType: {...fonts.captionReg, color: colors.textMuted},
  traitValue: {...fonts.body2Bold, color: colors.text},
});
