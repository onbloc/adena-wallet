import axios from 'axios';
import { OfflineAminoSigner, makeCosmoshubPath } from '@cosmjs/amino';

import { AppConfig } from '../config/network';
import { GnoClient } from '../lcd';
import { OblClient } from '../obl';
import { Secp256k1HdWallet } from '../signer';

export type WalletLoader = (chainId: string, addressPrefix?: string) => Promise<OfflineAminoSigner>;

export async function loadOrCreateWalletDirect(
  _chainId: string,
  addressPrefix?: string,
  pin?: string,
): Promise<OfflineAminoSigner> {
  const hdPath = makeCosmoshubPath(0);

  const key = 'adena-wallet';
  pin = pin ?? key;
  const loaded = localStorage.getItem(key);
  if (!loaded) {
    const signer = await Secp256k1HdWallet.generate(12, {
      hdPaths: [hdPath],
      prefix: addressPrefix,
    });

    localStorage.setItem(key, await signer.serialize(pin));

    return signer;
  }

  return Secp256k1HdWallet.deserialize(loaded, pin);
}

export function createGnoClient(config: AppConfig): GnoClient {
  const instance = axios.create({
    baseURL: config.gnoUrl,
    timeout: 15000,
  });

  return new GnoClient(instance);
}

export function createOlbClient(config: AppConfig): OblClient {
  const instance = axios.create({
    baseURL: config.explorerUrl,
    timeout: 15000,
  });

  return new OblClient(instance);
}
