import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import React, {useState} from 'react';
import {StyleSheet, Switch, Text, View} from 'react-native';

import {useNftCollections} from '../../core/use-nft';
import type {MainStackParams} from '../../navigation/types';
import {Field, Screen} from '../../ui/components';
import {NftImage} from '../../ui/nft';
import {colors, colorTokens, fonts} from '../../ui/theme';

type Props = NativeStackScreenProps<MainStackParams, 'ManageNft'>;

/** The extension's Manage Collectables: search and show/hide each collection. */
export function ManageNftScreen({}: Props) {
  const nft = useNftCollections();
  const [keyword, setKeyword] = useState('');
  const query = keyword.toLowerCase();
  const filtered = nft.collections.filter(
    item =>
      query === '' ||
      item.name.toLowerCase().includes(query) ||
      item.symbol.toLowerCase().includes(query),
  );

  return (
    <Screen>
      <Field
        label="Search"
        hideLabel
        placeholder="Search"
        value={keyword}
        onChangeText={setKeyword}
      />
      {filtered.length === 0 && (
        <Text style={styles.empty}>No collections to display</Text>
      )}
      {filtered.map(item => (
        <View key={item.packagePath} style={styles.row}>
          <View style={styles.thumb}>
            <NftImage token={item} />
          </View>
          <View style={styles.names}>
            <Text style={styles.name} numberOfLines={1}>
              {item.name}
            </Text>
            <Text style={styles.path} numberOfLines={1}>
              {item.packagePath}
            </Text>
          </View>
          <Switch
            accessibilityLabel={`Show ${item.name}`}
            value={item.display}
            onValueChange={value => nft.setDisplay(item.packagePath, value)}
            trackColor={{true: colors.primary, false: colorTokens.neutral._7}}
          />
        </View>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  empty: {...fonts.body1Reg, color: colors.textMuted, textAlign: 'center'},
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 18,
    backgroundColor: colorTokens.neutral._9,
  },
  thumb: {width: 34, height: 34, borderRadius: 17, overflow: 'hidden'},
  names: {flex: 1},
  name: {...fonts.body2Bold, color: colors.text},
  path: {...fonts.captionReg, color: colors.textMuted},
});
