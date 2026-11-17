import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import React, {useLayoutEffect} from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';

import {useNftTokens} from '../../core/use-nft';
import type {MainStackParams} from '../../navigation/types';
import {NftImage} from '../../ui/nft';
import {colors, colorTokens, fonts} from '../../ui/theme';

type Props = NativeStackScreenProps<MainStackParams, 'NftCollection'>;

const PADDING = 20;
const GAP = 16;

/** The extension's collection page: the account's tokens of one realm. */
export function NftCollectionScreen({navigation, route}: Props) {
  const {collection} = route.params;
  const {data: tokens, done} = useNftTokens(collection);
  const {width} = useWindowDimensions();
  const cardSize = (width - PADDING * 2 - GAP) / 2;

  useLayoutEffect(() => {
    navigation.setOptions({title: collection.name});
  }, [navigation, collection.name]);

  return (
    <SafeAreaView style={styles.screen} edges={['bottom', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.body}>
        {!done ? (
          <ActivityIndicator style={styles.spinner} color={colors.textMuted} />
        ) : !tokens || tokens.length === 0 ? (
          <Text style={styles.empty}>No NFTs to display</Text>
        ) : (
          <View style={styles.grid}>
            {tokens.map(token => (
              <Pressable
                key={token.tokenId}
                accessibilityRole="button"
                accessibilityLabel={`${token.name} #${token.tokenId}`}
                onPress={() => navigation.navigate('NftAsset', {token})}
                style={[styles.card, {width: cardSize, height: cardSize}]}>
                <NftImage token={token} />
                <View style={styles.badge}>
                  <Text style={styles.badgeName} numberOfLines={1}>
                    {token.name}
                  </Text>
                  <Text style={styles.badgeId} numberOfLines={1}>
                    #{token.tokenId}
                  </Text>
                </View>
                {token.isOwned === false && (
                  <Text style={styles.staked}>Staked</Text>
                )}
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const {neutral} = colorTokens;

const styles = StyleSheet.create({
  screen: {flex: 1, backgroundColor: colors.background},
  body: {padding: PADDING, flexGrow: 1},
  spinner: {marginTop: 120},
  empty: {
    ...fonts.body1Reg,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 120,
  },
  grid: {flexDirection: 'row', flexWrap: 'wrap', gap: GAP},
  card: {borderRadius: 8, overflow: 'hidden'},
  badge: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    right: 10,
    height: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingHorizontal: 8,
    borderRadius: 10,
    backgroundColor: neutral._9,
  },
  badgeName: {...fonts.captionBold, color: colors.text, flexShrink: 1},
  badgeId: {...fonts.captionReg, color: colors.textMuted, flexShrink: 0},
  staked: {
    position: 'absolute',
    top: 10,
    right: 10,
    ...fonts.light1Bold,
    color: colors.text,
    paddingHorizontal: 6,
    borderRadius: 4,
    overflow: 'hidden',
    backgroundColor: neutral._7,
  },
});
