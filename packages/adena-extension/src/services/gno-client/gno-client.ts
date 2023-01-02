import { ResourceService } from '..';

export const loadNetworkConfigs = async () => {
  try {
    const networks = await ResourceService.fetchChainNetworks();
    return networks;
  } catch (error) {
    console.error(error);
  }
  return [];
};
