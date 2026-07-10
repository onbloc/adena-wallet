import { encodeSecp256k1Pubkey, pubkeyToAddress } from '@cosmjs/amino';
import { Secp256k1, Secp256k1Signature, sha256, Slip10RawIndex } from '@cosmjs/crypto';
import { LedgerConnector } from '@cosmjs/ledger-amino';
import { Signer } from '@gnolang/tm2-js-client';

import { HdPathLike, toSlip10Path } from './hd-path';

const GNO_ADDRESS_PREFIX = 'g';

// A faithful re-implementation of tm2-js-client's LedgerSigner that derives from
// a full HD path (account'/change/addressIndex) instead of only an address index.
//
// tm2's LedgerSigner (and Wallet.fromLedger) build their path with
// generateHDPath(accountIndex), which hardcodes account'/change to 0. Routing
// through Wallet.fromSigner with this signer lets a Ledger sign at any Adena path
// while keeping the exact byte pipeline (connector.getPubkey / connector.sign)
// tm2 uses, so signatures stay identical for the address-index-only case.
export class FullPathLedgerSigner implements Signer {
  private readonly connector: LedgerConnector;
  private readonly hdPath: Slip10RawIndex[];
  private readonly addressPrefix: string;

  constructor(
    connector: LedgerConnector,
    hdPath: HdPathLike,
    addressPrefix: string = GNO_ADDRESS_PREFIX,
  ) {
    this.connector = connector;
    this.hdPath = toSlip10Path(hdPath);
    this.addressPrefix = addressPrefix;
  }

  getAddress = async (): Promise<string> => {
    return pubkeyToAddress(
      encodeSecp256k1Pubkey(await this.connector.getPubkey(this.hdPath)),
      this.addressPrefix,
    );
  };

  getPublicKey = async (): Promise<Uint8Array> => {
    return this.connector.getPubkey(this.hdPath);
  };

  getPrivateKey = async (): Promise<Uint8Array> => {
    throw new Error('Ledger does not support private key exports');
  };

  signData = async (data: Uint8Array): Promise<Uint8Array> => {
    return this.connector.sign(data, this.hdPath);
  };

  verifySignature = async (data: Uint8Array, signature: Uint8Array): Promise<boolean> => {
    const publicKey = await this.getPublicKey();
    return Secp256k1.verifySignature(
      Secp256k1Signature.fromFixedLength(signature),
      sha256(data),
      publicKey,
    );
  };
}
