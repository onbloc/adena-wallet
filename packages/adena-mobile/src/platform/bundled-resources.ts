import ATOMONE_CHAIN_DATA from '@resources/chains/atomone-chains.json';
import GNO_CHAIN_DATA from '@resources/chains/chains.json';
import type {AxiosInstance} from 'axios';

/**
 * The extension reads the default network list over HTTP from its own origin
 * (`/resources/chains/*.json`). The app has no such origin, so the same files
 * are served from the bundle; any other request fails rather than going to
 * the network.
 */
const bundledResources: Record<string, unknown> = {
  '/resources/chains/chains.json': GNO_CHAIN_DATA,
  '/resources/chains/atomone-chains.json': ATOMONE_CHAIN_DATA,
};

export const bundledResourceClient = {
  get: async (url: string) => {
    if (!(url in bundledResources)) {
      throw new Error(`No bundled resource for ${url}`);
    }
    return {data: bundledResources[url]};
  },
} as unknown as AxiosInstance;
