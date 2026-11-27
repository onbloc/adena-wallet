import { wipeKeyPair } from '../crypto/key-pair';
import { HDKeyring } from '../crypto/keyring';
import { TokenBalance } from '../domain/account';
import { Network } from '../domain/network';
import { ChainRegistry } from '../repositories/chain/chain-registry';

export interface HdAccountCandidate {
  hdIndex: number;
  address: string;
}

// Derives addresses of a recovery phrase before any wallet exists (import account picker).
// Holds the seed in memory until destroy().
export class HdAccountPreview {
  private readonly keyring: HDKeyring;
  private destroyed = false;

  constructor(mnemonic: string, private readonly chainRegistry: ChainRegistry, private readonly network: Network) {
    this.keyring = new HDKeyring('preview', mnemonic);
  }

  async derive(from: number, count: number): Promise<HdAccountCandidate[]> {
    const candidates: HdAccountCandidate[] = [];
    const chain = this.chainRegistry.forNetwork(this.network);

    for (let hdIndex = from; hdIndex < from + count && !this.destroyed; hdIndex++) {
      const keyPair = await this.keyring.deriveKeyPair(hdIndex);

      // A derive in flight at destroy() may have re-created the seed; wipe it again.
      if (this.destroyed) {
        wipeKeyPair(keyPair);
        this.keyring.destroy();
        break;
      }

      try {
        candidates.push({ hdIndex, address: chain.deriveAddress(keyPair.publicKey, this.network) });
      }
      finally {
        wipeKeyPair(keyPair);
      }
    }

    return candidates;
  }

  // Null when the chain cannot be reached.
  async getNativeBalance(address: string): Promise<TokenBalance | null> {
    try {
      return await this.chainRegistry.forNetwork(this.network).getNativeBalance(address, this.network);
    }
    catch {
      return null;
    }
  }

  destroy(): void {
    this.destroyed = true;
    this.keyring.destroy();
  }
}
