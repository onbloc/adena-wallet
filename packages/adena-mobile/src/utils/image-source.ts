import { fromBase64 } from '@cosmjs/encoding';

export const ImageSourceKind = {
  SVG_XML: 'svg-xml',
  SVG_URI: 'svg-uri',
  RASTER: 'raster',
  NONE: 'none',
} as const;

export type ImageSourceKind = (typeof ImageSourceKind)[keyof typeof ImageSourceKind];

export type ImageSource
  = | { kind: typeof ImageSourceKind.SVG_XML; xml: string }
    | { kind: typeof ImageSourceKind.SVG_URI; uri: string }
    | { kind: typeof ImageSourceKind.RASTER; uri: string }
    | { kind: typeof ImageSourceKind.NONE };

const MAX_SVG_BYTES = 512 * 1024;

// Classifies on-chain/remote image URIs; only https and data URIs are rendered.
export const resolveImageSource = (uri?: string | null): ImageSource => {
  if (!uri) {
    return { kind: ImageSourceKind.NONE };
  }

  const trimmed = uri.trim();
  const svgData = /^data:image\/svg\+xml(;[^,]*)?,(.*)$/is.exec(trimmed);

  if (svgData) {
    try {
      const isBase64 = /;base64/i.test(svgData[1] ?? '');
      const xml = isBase64 ? new TextDecoder().decode(fromBase64(svgData[2])) : decodeURIComponent(svgData[2]);

      return xml.length <= MAX_SVG_BYTES ? { kind: ImageSourceKind.SVG_XML, xml } : { kind: ImageSourceKind.NONE };
    }
    catch {
      return { kind: ImageSourceKind.NONE };
    }
  }

  if (/^data:image\/(png|jpe?g|gif|webp);base64,/i.test(trimmed)) {
    return { kind: ImageSourceKind.RASTER, uri: trimmed };
  }

  if (/^https:\/\//i.test(trimmed)) {
    return /\.svg(\?.*)?$/i.test(trimmed) ? { kind: ImageSourceKind.SVG_URI, uri: trimmed } : { kind: ImageSourceKind.RASTER, uri: trimmed };
  }

  return { kind: ImageSourceKind.NONE };
};
