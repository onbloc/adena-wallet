// Messages are held in amino form (like adena-module) and converted to protobuf for signing.
export const COSMOS_MSG_SEND_AMINO_TYPE = 'cosmos-sdk/MsgSend';
export const COSMOS_MSG_SEND_TYPE_URL = '/cosmos.bank.v1beta1.MsgSend';

export interface CosmosMsgSend {
  type: typeof COSMOS_MSG_SEND_AMINO_TYPE;
  value: { from_address: string; to_address: string; amount: { denom: string; amount: string }[] };
}

export type CosmosMessage = CosmosMsgSend;
