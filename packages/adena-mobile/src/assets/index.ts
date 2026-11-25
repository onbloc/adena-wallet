import { ImageSourcePropType } from 'react-native';

import { LocalTokenIcon } from '../domain/token';
import { ImageSourceKind } from '../utils/image-source';
import AkkadiaLogo from './apps/akkadia.jpg';
import BazaarLogo from './apps/bazaar.svg';
import BubbleRumbleLogo from './apps/bubblerumble.svg';
import GnoDocsLogo from './apps/gnodocs.svg';
import GnolandLogo from './apps/gnoland.svg';
import GnomiLogo from './apps/gnomi.svg';
import GnoscanLogo from './apps/gnoscan.svg';
import GnoswapLogo from './apps/gnoswap.svg';
import KourtLogo from './apps/kourt.svg';
import PlaygroundLogo from './apps/playground.svg';
import AtomoneChainIcon from './icons/chains/atomone.svg';
import GnoChainIcon from './icons/chains/gno-chain.svg';
import AtoneIcon from './icons/tokens/atone.svg';
import GnotIcon from './icons/tokens/gnot.svg';
import PhotonIcon from './icons/tokens/photon.svg';
import UnknownTokenIcon from './icons/tokens/unknown-token.svg';
import AdenaLogo from './images/adena-logo.png';
import EmptyImage from './images/empty-image.svg';

// Single registry for bundled artwork; components never import asset files directly.
export const tokenIcons: Record<LocalTokenIcon, typeof GnotIcon> = {
  gnot: GnotIcon,
  atone: AtoneIcon,
  photon: PhotonIcon,
};

export const assets = {
  unknownToken: UnknownTokenIcon,
  emptyImage: EmptyImage,
  // Same artwork and size as the native launch screen logo.
  adenaLogo: AdenaLogo,
  chains: { gno: GnoChainIcon, cosmos: AtomoneChainIcon },
} as const;

export const AppLogoKind = {
  SVG: 'svg',
  RASTER: 'raster',
} as const;

export type AppLogo
  = | { kind: typeof AppLogoKind.SVG; Component: typeof GnotIcon }
    | { kind: typeof AppLogoKind.RASTER; source: ImageSourcePropType };

// Explore app logos keyed by the `logo` field of resources/apps/apps.json.
export const appLogos: Record<string, AppLogo> = {
  gnoland: { kind: AppLogoKind.SVG, Component: GnolandLogo },
  playground: { kind: AppLogoKind.SVG, Component: PlaygroundLogo },
  gnodocs: { kind: AppLogoKind.SVG, Component: GnoDocsLogo },
  gnoswap: { kind: AppLogoKind.SVG, Component: GnoswapLogo },
  gnoscan: { kind: AppLogoKind.SVG, Component: GnoscanLogo },
  kourt: { kind: AppLogoKind.SVG, Component: KourtLogo },
  bubblerumble: { kind: AppLogoKind.SVG, Component: BubbleRumbleLogo },
  akkadia: { kind: ImageSourceKind.RASTER, source: AkkadiaLogo },
  gnomi: { kind: AppLogoKind.SVG, Component: GnomiLogo },
  bazaar: { kind: AppLogoKind.SVG, Component: BazaarLogo },
};
