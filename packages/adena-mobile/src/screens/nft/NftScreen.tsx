import ManageIcon from '@assets/main-manage-tokens-filter.svg';
import {useFocusEffect} from '@react-navigation/native';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import type {GRC721CollectionModel} from '@types';
import BigNumber from 'bignumber.js';
import React, {useCallback} from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';

import {useNftBalance, useNftCollections} from '../../core/use-nft';
import type {MainStackParams} from '../../navigation/types';
import {NftImage, PinIcon} from '../../ui/nft';
import {TabBar} from '../../ui/tab-bar';
import {colors, colorTokens, fonts} from '../../ui/theme';

type Props = NativeStackScreenProps<MainStackParams, 'Nft'>;

const PADDING = 20;
const GAP = 16;

/** The extension's NFT tab: collection cards (pinned first), then Manage. */
export function NftScreen({navigation}: Props) {
  const nft = useNftCollections();
  const {width} = useWindowDimensions();
  const cardSize = (width - PADDING * 2 - GAP) / 2;
  const {reload} = nft;

  // Back from Manage: re-read what it stored.
  useFocusEffect(
    useCallback(() => {
      reload();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []),
  );

  const manage = (
    <Pressable
      accessibilityRole="button"
      onPress={() => navigation.navigate('ManageNft')}
      style={({pressed}) => [styles.manage, pressed && styles.pressed]}>
      <ManageIcon width={16} height={16} />
      <Text style={styles.manageText}>Manage Collectables</Text>
    </Pressable>
  );

  let body: React.ReactNode;
  if (!nft.supported) {
    body = (
      <Text style={styles.empty}>NFTs are not available on this network.</Text>
    );
  } else if (nft.collections.length === 0) {
    body = nft.loading ? (
      <ActivityIndicator style={styles.spinner} color={colors.textMuted} />
    ) : (
      <Text style={styles.empty}>No NFTs to display</Text>
    );
  } else if (nft.shown.length === 0) {
    body = <View style={styles.onlyManage}>{manage}</View>;
  } else {
    body = (
      <>
        <View style={styles.grid}>
          {nft.shown.map(collection => (
            <CollectionCard
              key={collection.packagePath}
              collection={collection}
              size={cardSize}
              pinned={nft.pinned.includes(collection.packagePath)}
              onPin={() => nft.togglePin(collection.packagePath)}
              onPress={() =>
                navigation.navigate('NftCollection', {collection})
              }
            />
          ))}
        </View>
        {manage}
      </>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={['left', 'right']}>
      <ScrollView
        contentContainerStyle={styles.body}
        refreshControl={
          <RefreshControl
            refreshing={nft.loading && nft.collections.length > 0}
            onRefresh={nft.refresh}
            tintColor={colors.textMuted}
          />
        }>
        {body}
      </ScrollView>
      <TabBar current="Nft" />
    </SafeAreaView>
  );
}

function CollectionCard({
  collection,
  size,
  pinned,
  onPin,
  onPress,
}: {
  collection: GRC721CollectionModel;
  size: number;
  pinned: boolean;
  onPin: () => void;
  onPress: () => void;
}) {
  const {data: balance} = useNftBalance(collection.packagePath);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={collection.name}
      onPress={onPress}
      style={[styles.card, {width: size, height: size}]}>
      <NftImage token={collection} />
      <View style={styles.badge}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={pinned ? 'Unpin collection' : 'Pin collection'}
          accessibilityState={{selected: pinned}}
          hitSlop={10}
          onPress={onPin}>
          <PinIcon color={pinned ? colorTokens.neutral._1 : colorTokens.neutral._5} />
        </Pressable>
        <Text style={styles.badgeName} numberOfLines={1}>
          {collection.name}
        </Text>
        {balance !== null && (
          <Text style={styles.badgeCount}>{BigNumber(balance).toFormat()}</Text>
        )}
      </View>
    </Pressable>
  );
}

const {neutral} = colorTokens;

const styles = StyleSheet.create({
  screen: {flex: 1, backgroundColor: colors.background},
  body: {padding: PADDING, gap: 24, flexGrow: 1},
  spinner: {marginTop: 120},
  empty: {
    ...fonts.body1Reg,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 120,
  },
  onlyManage: {paddingTop: 120},
  grid: {flexDirection: 'row', flexWrap: 'wrap', gap: GAP},
  card: {borderRadius: 8, overflow: 'hidden'},
  badge: {
    position: 'absolute',
    top: 10,
    left: 10,
    right: 10,
    alignSelf: 'center',
    height: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingLeft: 8,
    paddingRight: 5,
    borderRadius: 10,
    backgroundColor: neutral._9,
  },
  badgeName: {...fonts.captionBold, color: colors.text, flexShrink: 1},
  badgeCount: {...fonts.light1Bold, color: colors.textMuted},
  manage: {
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    height: 34,
    borderRadius: 17,
    backgroundColor: neutral._7,
  },
  pressed: {opacity: 0.8},
  manageText: {...fonts.body2Bold, color: colors.text},
});
