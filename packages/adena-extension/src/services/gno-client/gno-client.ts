import axios from 'axios';

interface Chain {
  main: boolean;
  chainId: string;
  chainName: string;
  order: number;
  networks: Array<Network>;
};

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

export const loadNetworkConfigs = async () => {
  try {
    const response = await axios.get<Array<Chain>>(
      'https://raw.githubusercontent.com/onbloc/adena-resource/feature/structure/configs/chains.json',
    );
    const networks = response.data.find(chain => chain.main)?.networks ?? [];
    return networks;
  } catch (error) {
    console.error(error);
  }
  return [];
};
