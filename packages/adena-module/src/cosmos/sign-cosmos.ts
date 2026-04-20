import { CosmosSignMode } from '../chain-registry/types';
import { Keyring } from '../wallet/keyring/keyring';

import { signCosmosAmino } from './amino/sign-cosmos-amino';
import { signCosmosDirect } from './direct/sign-cosmos-direct';
import { CosmosProvider } from './providers/cosmos-provider';
import { CosmosDocument, SignedCosmosTx } from './types';

export interface SignCosmosParams {
  document: CosmosDocument;
  keyring: Keyring;
  cosmosProvider: CosmosProvider;
  hdPath?: number;
  signMode: CosmosSignMode;
}

/**
 * Dispatches to the AMINO or DIRECT pipeline based on the requested sign mode.
 * Callers (e.g. `TransactionService`) resolve the preferred mode from the
 * chain registry and pass it in explicitly — this module has no chain-registry
 * dependency so it can be unit tested in isolation.
 */
export async function signCosmos(
  params: SignCosmosParams,
): Promise<SignedCosmosTx> {
  const { document, keyring, cosmosProvider, hdPath, signMode } = params;

  switch (signMode) {
    case 'SIGN_MODE_DIRECT':
      return signCosmosDirect({ document, keyring, cosmosProvider, hdPath });
    case 'SIGN_MODE_LEGACY_AMINO_JSON':
      return signCosmosAmino({ document, keyring, cosmosProvider, hdPath });
    default: {
      const _exhaustive: never = signMode;
      throw new Error(`Unsupported Cosmos sign mode: ${String(_exhaustive)}`);
    }
  }
}
