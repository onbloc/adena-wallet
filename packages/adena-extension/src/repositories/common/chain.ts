import { AdenaStorage } from "@common/storage";

type LocalValueType = 'NETWORKS';

interface Network {
  main: boolean;
  chainId: string;
  chainName: string;
  addressPrefix: string;
  rpcUrl: string;
  gnoUrl: string;
  apiUrl: string;
  linkUrl: string;
  token: {
    denom: string;
    unit: number;
    minimalDenom: string;
    minimalUnit: number;
  }
};

export const getNetworks = async () => {
  const localStorage = AdenaStorage.local<LocalValueType>();
  const networks = await localStorage.getToObject<Array<Network>>('NETWORKS');
  return networks;
};

export const updateNetworks = async (networks: Array<Network>) => {
  const localStorage = AdenaStorage.local<LocalValueType>();
  await localStorage.setByObject('NETWORKS', networks);
};

export const deleteNetworks = async () => {
  const localStorage = AdenaStorage.local<LocalValueType>();
  await localStorage.remove('NETWORKS');
};