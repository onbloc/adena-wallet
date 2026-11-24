import React, { ReactElement, useState } from 'react';
import { DimensionValue, Image, View } from 'react-native';
import { SvgUri, SvgXml } from 'react-native-svg';

import { assets } from '../../../assets';
import { ImageSourceKind, resolveImageSource } from '../../../utils/image-source';
import { Skeleton } from '../../atoms';
import { styles } from './nft-image.styles';

export interface NftImageProps {
  uri?: string | null;
  loading?: boolean;
  size?: DimensionValue;
  // Changing this (e.g. on pull-to-refresh) retries a source that failed before.
  retryKey?: string | number;
}

// Square artwork frame; renders SVG (inline or remote) and raster images, with a placeholder on failure.
export const NftImage = ({ uri, loading = false, size = '100%', retryKey }: NftImageProps): ReactElement => {
  // Failure belongs to one source and retry key; keyed elements remount per URI so an old element cannot report late errors.
  const [failure, setFailure] = useState<{ uri?: string | null; retryKey?: string | number } | null>(null);
  const failed = failure !== null && failure.uri === uri && failure.retryKey === retryKey;
  const source = failed ? { kind: ImageSourceKind.NONE } : resolveImageSource(uri);

  if (loading) {
    return <View style={[styles.frame, { width: size }]}><Skeleton height={400} /></View>;
  }

  const handleError = (): void => setFailure({ uri, retryKey });

  const handleSvgUriError = (): void => setFailure({ uri, retryKey });

  const handleImageError = (): void => setFailure({ uri, retryKey });

  return (
    <View style={[styles.frame, { width: size }]}>
      {source.kind === ImageSourceKind.SVG_XML && <SvgXml key={uri ?? ''} xml={source.xml} width='100%' height='100%' onError={handleError} />}
      {source.kind === ImageSourceKind.SVG_URI && <SvgUri key={source.uri} uri={source.uri} width='100%' height='100%' onError={handleSvgUriError} />}
      {source.kind === ImageSourceKind.RASTER && (
        <Image key={source.uri} source={{ uri: source.uri }} style={styles.fill} resizeMode='cover' onError={handleImageError} accessibilityIgnoresInvertColors />
      )}
      {source.kind === ImageSourceKind.NONE && <View style={styles.placeholder}><assets.emptyImage width={40} height={40} /></View>}
    </View>
  );
};
