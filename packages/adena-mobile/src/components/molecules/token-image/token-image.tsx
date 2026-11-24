import React, { ReactElement, useState } from 'react';
import { Image, View } from 'react-native';
import { SvgUri } from 'react-native-svg';

import { assets, tokenIcons } from '../../../assets';
import { LocalTokenIcon } from '../../../domain/token';
import { radius } from '../../../theme';
import { ImageSourceKind, resolveImageSource } from '../../../utils/image-source';
import { Text } from '../../atoms';
import { styles } from './token-image.styles';

export interface TokenImageProps {
  symbol: string;
  localIcon?: LocalTokenIcon;
  imageUrl?: string;
  size?: number;
}

// Bundled icon → remote image → monogram fallback.
export const TokenImage = ({ symbol, localIcon, imageUrl, size = 32 }: TokenImageProps): ReactElement => {
  // Failure belongs to one source; keyed elements remount per URI so an old element cannot report late errors.
  const [failedSource, setFailedSource] = useState<string | null | undefined>(null);
  const frame = { width: size, height: size, borderRadius: radius.circle };

  if (localIcon) {
    const Icon = tokenIcons[localIcon];

    return <Icon width={size} height={size} />;
  }

  const source = failedSource !== null && failedSource === imageUrl ? { kind: ImageSourceKind.NONE } : resolveImageSource(imageUrl);

  const handleError = (): void => setFailedSource(imageUrl);

  if (source.kind === ImageSourceKind.SVG_URI) {
    return (
      <View style={[styles.clip, frame]}>
        <SvgUri key={source.uri} uri={source.uri} width={size} height={size} onError={handleError} />
      </View>
    );
  }

  const handleImageError = (): void => setFailedSource(imageUrl);

  if (source.kind === ImageSourceKind.RASTER) {
    return <Image key={source.uri} source={{ uri: source.uri }} style={frame} onError={handleImageError} accessibilityIgnoresInvertColors />;
  }

  if (!symbol) {
    const Unknown = assets.unknownToken;

    return <Unknown width={size} height={size} />;
  }

  return (
    <View style={[styles.monogram, frame]}>
      <Text variant='tab'>{symbol.slice(0, 1).toUpperCase()}</Text>
    </View>
  );
};
