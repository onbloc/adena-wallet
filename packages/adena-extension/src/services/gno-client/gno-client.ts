import axios from 'axios';

interface ChainType {
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
  };
}
export const loadNetworkConfigs = async () => {
  try {
    const response = await axios.get<{ [key in string]: ChainType }>(
      'https://raw.githubusercontent.com/onbloc/adena-resource/main/configs/chains.json',
    );
    const configSet = response.data;
    return Object.keys(configSet).map((key) => configSet[key]);
  } catch (error) {
    console.error(error);
  }
  return [];
};
