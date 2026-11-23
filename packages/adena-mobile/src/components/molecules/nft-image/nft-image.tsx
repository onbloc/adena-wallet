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
  const [failed, setFailed] = useState(false);
  const source = failed ? { kind: ImageSourceKind.NONE } : resolveImageSource(uri);

  if (loading) {
    return <View style={[styles.frame, { width: size }]}><Skeleton height={400} /></View>;
  }

  const handleError = (): void => setFailed(true);

  const handleSvgUriError = (): void => setFailed(true);

  const handleImageError = (): void => setFailed(true);

  return (
    <View style={[styles.frame, { width: size }]}>
      {source.kind === ImageSourceKind.SVG_XML && <SvgXml xml={source.xml} width='100%' height='100%' onError={handleError} />}
      {source.kind === ImageSourceKind.SVG_URI && <SvgUri uri={source.uri} width='100%' height='100%' onError={handleSvgUriError} />}
      {source.kind === ImageSourceKind.RASTER && (
        <Image source={{ uri: source.uri }} style={styles.fill} resizeMode='cover' onError={handleImageError} accessibilityIgnoresInvertColors />
      )}
      {source.kind === ImageSourceKind.NONE && <View style={styles.placeholder}><assets.emptyImage width={40} height={40} /></View>}
    </View>
  );
};
