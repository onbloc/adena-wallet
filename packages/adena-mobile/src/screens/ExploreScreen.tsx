import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import React, {useState} from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';

import {normalizeInput} from '../browser/BrowserScreen';
import {exploreSites, type SiteLogo} from '../core/explore-sites';
import type {MainStackParams} from '../navigation/types';
import {ChevronRightIcon} from '../ui/icons';
import {TabBar} from '../ui/tab-bar';
import {colors, colorTokens, fonts, inputFont, radius} from '../ui/theme';

type Props = NativeStackScreenProps<MainStackParams, 'Explore'>;

const SITES = exploreSites();
const LOGO_SIZE = 34;

function Logo({logo}: {logo: SiteLogo | null}) {
  if (typeof logo === 'number') {
    return <Image source={logo} style={styles.logo} />;
  }
  if (logo) {
    const Mark = logo;
    return <Mark width={LOGO_SIZE} height={LOGO_SIZE} />;
  }
  return <View style={styles.logo} />;
}

/**
 * The extension's Explore tab: the listed dApps in their order, each opened
 * in the in-app browser. An address field opens any other https site.
 */
export function ExploreScreen({navigation}: Props) {
  const [address, setAddress] = useState('');

  const open = (url: string) => navigation.navigate('Browser', {url});

  return (
    <SafeAreaView style={styles.screen} edges={['left', 'right']}>
      <ScrollView
        contentContainerStyle={styles.body}
        keyboardShouldPersistTaps="handled">
        <TextInput
          accessibilityLabel="Search or enter address"
          placeholder="Search or enter address"
          placeholderTextColor={colors.textMuted}
          value={address}
          onChangeText={setAddress}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="go"
          onSubmitEditing={() => {
            if (address.trim()) {
              open(normalizeInput(address));
            }
          }}
          style={styles.address}
        />
        {SITES.map(site => (
          <Pressable
            key={`${site.order}-${site.link}`}
            accessibilityRole="link"
            accessibilityLabel={site.name}
            onPress={() => open(site.link)}
            style={({pressed}) => [styles.site, pressed && styles.pressed]}>
            <Logo logo={site.bundledLogo} />
            <View style={styles.siteText}>
              <Text style={styles.siteName} numberOfLines={1}>
                {site.name}
              </Text>
              <Text style={styles.siteDescription} numberOfLines={2}>
                {site.description}
              </Text>
            </View>
            <ChevronRightIcon />
          </Pressable>
        ))}
      </ScrollView>
      <TabBar current="Explore" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {flex: 1, backgroundColor: colors.background},
  body: {padding: 20, gap: 12},
  pressed: {opacity: 0.85},
  address: {
    ...inputFont(fonts.body2Reg),
    height: 44,
    paddingHorizontal: 16,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colorTokens.neutral._9,
    color: colors.text,
    marginBottom: 4,
  },
  logo: {
    width: LOGO_SIZE,
    height: LOGO_SIZE,
    borderRadius: LOGO_SIZE / 2,
    backgroundColor: colorTokens.neutral._7,
  },
  site: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 60,
    paddingVertical: 10,
    paddingHorizontal: 17,
    borderRadius: 18,
    backgroundColor: colorTokens.neutral._9,
  },
  siteText: {flex: 1},
  siteName: {...fonts.body2Bold, color: colors.text},
  siteDescription: {...fonts.captionReg, color: colors.textMuted},
});
