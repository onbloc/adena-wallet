import UnknownToken from '@assets/common-unknown-token.svg';
import GnotLogo from '@assets/gnot-logo-white.svg';
import type {TokenModel} from '@types';
import React, {useState} from 'react';
import {Image, StyleSheet, View} from 'react-native';
import {SvgUri} from 'react-native-svg';

import {originOf} from '../browser/url-origin';
import {colorTokens} from './theme';

/**
 * A token's logo: GNOT from the bundle, others from the token resource's
 * https image (SVG drawn as shapes, nothing executed), else the extension's
 * unknown-token mark.
 */
export function TokenLogo({
  token,
  size = 34,
}: {
  token: Pick<TokenModel, 'type' | 'image'>;
  size?: number;
}) {
  const [failed, setFailed] = useState(false);
  const frame = [
    styles.frame,
    {width: size, height: size, borderRadius: size / 2},
  ];
  if (token.type === 'gno-native') {
    return (
      <View style={frame}>
        <GnotLogo width={size * 0.65} height={size * 0.65} />
      </View>
    );
  }
  const uri = token.image ?? '';
  const usable =
    !failed && originOf(uri)?.startsWith('https://') && /^\S+$/.test(uri);
  if (!usable) {
    return (
      <View style={frame}>
        <UnknownToken width={size} height={size} />
      </View>
    );
  }
  return (
    <View style={frame}>
      {/\.svg($|\?)/i.test(uri) ? (
        <SvgUri
          uri={uri}
          width={size}
          height={size}
          onError={() => setFailed(true)}
        />
      ) : (
        <Image
          source={{uri}}
          style={{width: size, height: size}}
          onError={() => setFailed(true)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colorTokens.neutral._7,
  },
});
