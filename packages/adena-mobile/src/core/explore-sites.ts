import AkkadiaLogo from '@resources/apps/images/akkadia.jpg';
import BazaarLogo from '@resources/apps/images/bazaar.svg';
import BubblerumbleLogo from '@resources/apps/images/bubblerumble.svg';
import GnodocsLogo from '@resources/apps/images/gnodocs.svg';
import GnolandLogo from '@resources/apps/images/gnoland.svg';
import GnomiLogo from '@resources/apps/images/gnomi.svg';
import GnoscanLogo from '@resources/apps/images/gnoscan.svg';
import GnoswapLogo from '@resources/apps/images/gnoswap.svg';
import KourtLogo from '@resources/apps/images/kourt.svg';
import PlaygroundLogo from '@resources/apps/images/playground.svg';
import type {AppInfoResponse} from '@repositories/common/response';
import APPS from '@resources/apps/apps.json';
import type React from 'react';
import type {SvgProps} from 'react-native-svg';

/** A bundled logo: an SVG component or a raster asset id. */
export type SiteLogo = React.FC<SvgProps> | number;

const LOGOS: Record<string, SiteLogo> = {
  'akkadia.jpg': AkkadiaLogo,
  'bazaar.svg': BazaarLogo,
  'bubblerumble.svg': BubblerumbleLogo,
  'gnodocs.svg': GnodocsLogo,
  'gnoland.svg': GnolandLogo,
  'gnomi.svg': GnomiLogo,
  'gnoscan.svg': GnoscanLogo,
  'gnoswap.svg': GnoswapLogo,
  'kourt.svg': KourtLogo,
  'playground.svg': PlaygroundLogo,
};

export interface ExploreSite extends AppInfoResponse {
  bundledLogo: SiteLogo | null;
}

/**
 * The extension's Explore list (resources/apps/apps.json, read there from the
 * extension's own files): shown ones in their order, with the bundled logos.
 */
export function exploreSites(apps: AppInfoResponse[] = APPS): ExploreSite[] {
  return apps
    .filter(site => site.display)
    .sort((a, b) => a.order - b.order)
    .map(site => ({
      ...site,
      bundledLogo: LOGOS[site.logo.split('/').pop() ?? ''] ?? null,
    }));
}
