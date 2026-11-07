// react-native-svg-transformer turns every SVG import into a component.
declare module '*.svg' {
  import type React from 'react';
  import type {SvgProps} from 'react-native-svg';
  const content: React.FC<SvgProps>;
  export default content;
}

// Bundled raster images resolve to an asset id for <Image source>.
declare module '*.jpg' {
  const source: number;
  export default source;
}
