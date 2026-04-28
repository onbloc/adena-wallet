import type { ChainRegistry } from 'adena-module';

import type { SerializedSignDoc } from '@inject/types';
import type { StdSignDoc } from '@cosmjs/amino';

// Request-level sanity checks for Cosmos handlers. Signer address format and
// signDoc field semantics are delegated to the `signCosmos` dispatcher, so we
// only guard obvious shape / chain mismatches here.

export function validateCosmosChainId(
  chainId: unknown,
  chainRegistry: ChainRegistry,
): chainId is string {
  if (typeof chainId !== 'string' || chainId.length === 0) {
    return false;
  }
  const chain = chainRegistry.getChainByChainId(chainId);
  return chain?.chainGroup === 'atomone';
}

export function validateAminoSignDoc(doc: unknown): doc is StdSignDoc {
  if (typeof doc !== 'object' || doc === null) {
    return false;
  }
  const candidate = doc as Record<string, unknown>;
  return (
    typeof candidate.chain_id === 'string' &&
    typeof candidate.account_number === 'string' &&
    typeof candidate.sequence === 'string' &&
    typeof candidate.fee === 'object' &&
    Array.isArray(candidate.msgs) &&
    typeof candidate.memo === 'string'
  );
}

export function validateSerializedSignDoc(doc: unknown): doc is SerializedSignDoc {
  if (typeof doc !== 'object' || doc === null) {
    return false;
  }
  const candidate = doc as Record<string, unknown>;
  return (
    typeof candidate.bodyBytes === 'string' &&
    typeof candidate.authInfoBytes === 'string' &&
    typeof candidate.chainId === 'string' &&
    typeof candidate.accountNumber === 'string'
  );
}
