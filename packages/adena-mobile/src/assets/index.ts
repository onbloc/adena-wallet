import { LocalTokenIcon } from '../domain/token';
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
