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
}

// Square artwork frame; renders SVG (inline or remote) and raster images, with a placeholder on failure.
export const NftImage = ({ uri, loading = false, size = '100%' }: NftImageProps): ReactElement => {
  // Failure belongs to one source; keyed elements remount per URI so an old element cannot report late errors.
  const [failedSource, setFailedSource] = useState<string | null | undefined>(null);
  const source = failedSource !== null && failedSource === uri ? { kind: ImageSourceKind.NONE } : resolveImageSource(uri);

  if (loading) {
    return <View style={[styles.frame, { width: size }]}><Skeleton height={400} /></View>;
  }

  const handleError = (): void => setFailedSource(uri);

  const handleSvgUriError = (): void => setFailedSource(uri);

  const handleImageError = (): void => setFailedSource(uri);

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
