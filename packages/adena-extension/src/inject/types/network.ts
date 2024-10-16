import { AdenaResponse } from '.';

export type AddNetworkParams = {
  chainId: string;
  chainName: string;
  rpcUrl: string;
};

export type AddNetworkResponse = AdenaResponse<AddNetworkParams>;

export type AdenaAddNetwork = (network: AddNetworkParams) => Promise<AddNetworkResponse>;

export enum SwitchNetworkResponseType {
  SWITCH_NETWORK_SUCCESS = 'SWITCH_NETWORK_SUCCESS',
  REDUNDANT_CHANGE_REQUEST = 'REDUNDANT_CHANGE_REQUEST',
  UNADDED_NETWORK = 'UNADDED_NETWORK',
}

interface SwitchNetworkResponseData {
  chainId: string;
}

export type SwitchNetworkResponse = AdenaResponse<SwitchNetworkResponseData>;

export type AdenaSwitchNetwork = (chainId: string) => Promise<SwitchNetworkResponse>;
