import { Keyring } from '../wallet/keyring/keyring';
import {
  isHDWalletKeyring,
  isLedgerKeyring,
  isMultisigKeyring,
  isPrivateKeyKeyring,
  isWeb3AuthKeyring,
} from '../wallet/keyring/keyring-util';

import { CosmosProvider } from './providers/cosmos-provider';
import { CosmosDocument } from './types';

export async function resolveAccount(
  document: CosmosDocument,
  cosmosProvider: CosmosProvider,
): Promise<{ accountNumber: string; sequence: string }> {
  // Treat empty string as missing so downstream BigInt(sequence) / BigInt(gas)
  // in make-tx-raw never receives '' (which would throw a cryptic SyntaxError).
  const docAccountNumber = nonEmpty(document.accountNumber);
  const docSequence = nonEmpty(document.sequence);
  if (docAccountNumber !== undefined && docSequence !== undefined) {
    return { accountNumber: docAccountNumber, sequence: docSequence };
  }

  const account = await cosmosProvider.getAccount(document.fromAddress);
  return {
    accountNumber: docAccountNumber ?? account.accountNumber,
    sequence: docSequence ?? account.sequence,
  };
}

function nonEmpty(v: string | undefined): string | undefined {
  return v === undefined || v === '' ? undefined : v;
}

export async function resolvePublicKey(
  keyring: Keyring,
  hdPath: number | undefined,
): Promise<Uint8Array> {
  if (isHDWalletKeyring(keyring)) return keyring.getPublicKey(hdPath ?? 0);
  if (isPrivateKeyKeyring(keyring)) return keyring.publicKey;
  if (isWeb3AuthKeyring(keyring)) return keyring.publicKey;

  if (isLedgerKeyring(keyring)) {
    return keyring.getPublicKey(hdPath ?? 0);
  }

  if (isMultisigKeyring(keyring)) {
    throw new Error('Multisig accounts do not support Cosmos chains');
  }

  throw new Error(
    `Keyring type ${keyring.type} cannot sign Cosmos transactions`,
  );
}
