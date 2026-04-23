import type {
  AccountData,
  AminoSignResponse,
  OfflineAminoSigner,
  StdSignDoc,
} from '@cosmjs/amino';
import type {
  DirectSignResponse,
  OfflineDirectSigner,
} from '@cosmjs/proto-signing';
import type { SignDoc } from 'cosmjs-types/cosmos/tx/v1beta1/tx';

import { deserializeSignDoc } from '@common/utils/cosmos-serialize';
import { base64ToBytes } from '@common/utils/encoding-util';
import type { CosmosKey, SerializedCosmosKey } from '@inject/types';

import { AdenaExecutor } from '../executor/executor';

export function decodeCosmosKey(wire: SerializedCosmosKey): CosmosKey {
  return {
    name: wire.name,
    algo: wire.algo,
    bech32Address: wire.bech32Address,
    isNanoLedger: wire.isNanoLedger,
    pubKey: Uint8Array.from(base64ToBytes(wire.pubKey)),
    address: Uint8Array.from(base64ToBytes(wire.address)),
  };
}

// Unwrap AdenaResponse for the OfflineSigner path only; CosmJS consumers
// (e.g. SigningStargateClient) expect bare values and a thrown Error on
// failure rather than a `{ status: 'failure' }` wrapper.
async function unwrap<T>(
  promise: Promise<{ status: string; data?: T | null; message?: string }>,
): Promise<T> {
  const response = await promise;
  if (response.status !== 'success' || response.data === undefined || response.data === null) {
    throw new Error(response.message || 'Adena Cosmos request failed');
  }
  return response.data;
}

export function createOfflineSigner(
  chainId: string,
): OfflineAminoSigner & OfflineDirectSigner {
  const getAccounts = async (): Promise<readonly AccountData[]> => {
    const wire = await unwrap(new AdenaExecutor().getCosmosKey(chainId));
    const key = decodeCosmosKey(wire);
    return [
      {
        address: key.bech32Address,
        pubkey: key.pubKey,
        algo: 'secp256k1',
      },
    ];
  };

  const signAmino = async (
    signer: string,
    signDoc: StdSignDoc,
  ): Promise<AminoSignResponse> => {
    return unwrap(new AdenaExecutor().signCosmosAmino(chainId, signer, signDoc));
  };

  const signDirect = async (
    signer: string,
    signDoc: SignDoc,
  ): Promise<DirectSignResponse> => {
    const wire = await unwrap(
      new AdenaExecutor().signCosmosDirect(chainId, signer, signDoc),
    );
    return {
      signed: deserializeSignDoc(wire.signed),
      signature: wire.signature,
    };
  };

  return { getAccounts, signAmino, signDirect };
}

export function createOfflineAminoSigner(chainId: string): OfflineAminoSigner {
  const full = createOfflineSigner(chainId);
  return { getAccounts: full.getAccounts, signAmino: full.signAmino };
}
