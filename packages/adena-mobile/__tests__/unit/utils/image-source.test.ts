import { toBase64 } from '@cosmjs/encoding';

import { ImageSourceKind, resolveImageSource } from '../../../src/utils/image-source';

const SVG = '<svg xmlns="http://www.w3.org/2000/svg"><text>한글 ✓</text></svg>';

describe('resolveImageSource', () => {
  it.each([undefined, null, ''])('returns NONE for %p', (value) => {
    expect(resolveImageSource(value)).toEqual({ kind: ImageSourceKind.NONE });
  });

  it('decodes url-encoded svg data uris', () => {
    expect(resolveImageSource(`  data:image/svg+xml;charset=utf-8,${encodeURIComponent(SVG)}  `)).toEqual({ kind: ImageSourceKind.SVG_XML, xml: SVG });
    expect(resolveImageSource(`DATA:IMAGE/SVG+XML,${encodeURIComponent(SVG)}`)).toEqual({ kind: ImageSourceKind.SVG_XML, xml: SVG });
  });

  it('decodes base64 svg data uris', () => {
    const encoded = toBase64(new TextEncoder().encode(SVG));

    expect(resolveImageSource(`data:image/svg+xml;BASE64,${encoded}`)).toEqual({ kind: ImageSourceKind.SVG_XML, xml: SVG });
  });

  it('keeps multi-line svg payloads', () => {
    expect(resolveImageSource('data:image/svg+xml,<svg>\n</svg>')).toEqual({ kind: ImageSourceKind.SVG_XML, xml: '<svg>\n</svg>' });
  });

  it('rejects svg payloads that fail to decode', () => {
    expect(resolveImageSource('data:image/svg+xml,%E0%A4%A')).toEqual({ kind: ImageSourceKind.NONE });
    expect(resolveImageSource('data:image/svg+xml;base64,@@@')).toEqual({ kind: ImageSourceKind.NONE });
  });

  it('rejects oversized svg payloads', () => {
    expect(resolveImageSource(`data:image/svg+xml,${'a'.repeat(512 * 1024)}`).kind).toBe(ImageSourceKind.SVG_XML);
    expect(resolveImageSource(`data:image/svg+xml,${'a'.repeat(512 * 1024 + 1)}`)).toEqual({ kind: ImageSourceKind.NONE });
  });

  it.each(['png', 'jpg', 'jpeg', 'gif', 'webp', 'PNG'])('accepts base64 %s raster data uris', (type) => {
    const uri = `data:image/${type};base64,AAAA`;

    expect(resolveImageSource(uri)).toEqual({ kind: ImageSourceKind.RASTER, uri });
  });

  it('classifies https uris by extension', () => {
    expect(resolveImageSource('https://x.io/a.svg')).toEqual({ kind: ImageSourceKind.SVG_URI, uri: 'https://x.io/a.svg' });
    expect(resolveImageSource('HTTPS://x.io/a.SVG?v=1')).toEqual({ kind: ImageSourceKind.SVG_URI, uri: 'HTTPS://x.io/a.SVG?v=1' });
    expect(resolveImageSource('https://x.io/a.png')).toEqual({ kind: ImageSourceKind.RASTER, uri: 'https://x.io/a.png' });
    expect(resolveImageSource('https://x.io/a.svg.png')).toEqual({ kind: ImageSourceKind.RASTER, uri: 'https://x.io/a.svg.png' });
  });

  it.each(['http://x.io/a.png', 'ipfs://cid', 'file:///etc/passwd', 'javascript:alert(1)', 'data:image/png,raw', 'data:text/html;base64,AAAA', '   '])('rejects %p', (uri) => {
    expect(resolveImageSource(uri)).toEqual({ kind: ImageSourceKind.NONE });
  });
});
