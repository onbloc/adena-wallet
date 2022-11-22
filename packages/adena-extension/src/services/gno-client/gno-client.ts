import axios from 'axios';

const MOCK_CONFIG: Array<ChainType> = [
  {
    chainId: 'test2',
    chainName: 'Testnet 2',
    addressPrefix: 'g1',
    rpcUrl: 'https://rpc.test2.gno.land',
    gnoUrl: 'https://rpc.test2.gno.land',
    apiUrl: 'localhost',
    token: {
      denom: 'gnot',
      unit: 1,
      minimalDenom: 'ugnot',
      minimalUnit: 0.000001,
    },
  },
  {
    chainId: 'test3',
    chainName: 'Testnet 3',
    addressPrefix: 'g1',
    rpcUrl: 'https://rpc.test3.gno.land',
    gnoUrl: 'https://rpc.test3.gno.land',
    apiUrl: 'localhost',
    token: {
      denom: 'gnot',
      unit: 1,
      minimalDenom: 'ugnot',
      minimalUnit: 0.000001,
    },
  },
];

interface ChainType {
  chainId: string;
  chainName: string;
  addressPrefix: string;
  rpcUrl: string;
  gnoUrl: string;
  apiUrl: string;
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
  return MOCK_CONFIG;
};
