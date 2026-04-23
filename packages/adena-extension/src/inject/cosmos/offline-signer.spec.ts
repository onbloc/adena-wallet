// Stub out `@adena-wallet/sdk` to avoid pulling in @web3auth's native crypto at
// import time — jsdom's globals fail noble-hashes' Uint8Array instance check.
jest.mock('@adena-wallet/sdk', () => ({
  WalletResponseExecuteType: {},
  WalletResponseFailureType: {},
  WalletResponseStatus: { SUCCESS: 'success', FAILURE: 'failure' },
  WalletMessageInfo: {},
}));

import type { SignDoc } from 'cosmjs-types/cosmos/tx/v1beta1/tx';

import { bytesToBase64 } from '@common/utils/encoding-util';
import type { SerializedCosmosKey } from '@inject/types';

import { AdenaExecutor } from '../executor/executor';
import {
  createOfflineAminoSigner,
  createOfflineSigner,
  decodeCosmosKey,
} from './offline-signer';

jest.mock('../executor/executor');

const mockExecutorInstance = {
  getCosmosKey: jest.fn(),
  signCosmosAmino: jest.fn(),
  signCosmosDirect: jest.fn(),
};

beforeEach(() => {
  mockExecutorInstance.getCosmosKey.mockReset();
  mockExecutorInstance.signCosmosAmino.mockReset();
  mockExecutorInstance.signCosmosDirect.mockReset();
  (AdenaExecutor as jest.MockedClass<typeof AdenaExecutor>).mockImplementation(
    () => mockExecutorInstance as unknown as AdenaExecutor,
  );
});

describe('decodeCosmosKey', () => {
  it('decodes base64 pubKey and address back to Uint8Array', () => {
    const wire: SerializedCosmosKey = {
      name: 'account',
      algo: 'secp256k1',
      pubKey: bytesToBase64([1, 2, 3]),
      address: bytesToBase64([4, 5]),
      bech32Address: 'atone1xyz',
      isNanoLedger: false,
    };

    const key = decodeCosmosKey(wire);

    expect(key.pubKey).toBeInstanceOf(Uint8Array);
    expect(Array.from(key.pubKey)).toEqual([1, 2, 3]);
    expect(key.address).toBeInstanceOf(Uint8Array);
    expect(Array.from(key.address)).toEqual([4, 5]);
    expect(key.bech32Address).toBe('atone1xyz');
    expect(key.isNanoLedger).toBe(false);
    expect(key.algo).toBe('secp256k1');
  });
});

describe('createOfflineSigner', () => {
  const chainId = 'atomone-1';

  it('getAccounts returns AccountData with Uint8Array pubkey', async () => {
    mockExecutorInstance.getCosmosKey.mockResolvedValue({
      status: 'success',
      data: {
        name: 'account',
        algo: 'secp256k1',
        pubKey: bytesToBase64([7, 8, 9]),
        address: bytesToBase64([10, 11]),
        bech32Address: 'atone1abc',
        isNanoLedger: false,
      } satisfies SerializedCosmosKey,
    });

    const signer = createOfflineSigner(chainId);
    const accounts = await signer.getAccounts();

    expect(accounts).toHaveLength(1);
    expect(accounts[0].address).toBe('atone1abc');
    expect(accounts[0].pubkey).toBeInstanceOf(Uint8Array);
    expect(Array.from(accounts[0].pubkey)).toEqual([7, 8, 9]);
    expect(accounts[0].algo).toBe('secp256k1');
  });

  it('signDirect deserializes signed SignDoc back to native bytes and bigint', async () => {
    mockExecutorInstance.signCosmosDirect.mockResolvedValue({
      status: 'success',
      data: {
        signed: {
          bodyBytes: bytesToBase64([1, 2, 3]),
          authInfoBytes: bytesToBase64([4, 5, 6]),
          chainId,
          accountNumber: '42',
        },
        signature: { pub_key: { type: 't', value: 'v' }, signature: 'sig' },
      },
    });

    const signer = createOfflineSigner(chainId);
    const { signed, signature } = await signer.signDirect('atone1abc', {} as SignDoc);

    expect(signed.bodyBytes).toBeInstanceOf(Uint8Array);
    expect(Array.from(signed.bodyBytes)).toEqual([1, 2, 3]);
    expect(signed.authInfoBytes).toBeInstanceOf(Uint8Array);
    expect(signed.chainId).toBe(chainId);
    expect(signed.accountNumber).toBe(BigInt(42));
    expect(signature).toEqual({ pub_key: { type: 't', value: 'v' }, signature: 'sig' });
  });

  it('signAmino returns the raw AminoSignResponse payload', async () => {
    const aminoResponse = {
      signed: {
        chain_id: chainId,
        account_number: '1',
        sequence: '0',
        fee: { amount: [], gas: '1' },
        msgs: [],
        memo: '',
      },
      signature: { pub_key: { type: 't', value: 'v' }, signature: 'sig' },
    };
    mockExecutorInstance.signCosmosAmino.mockResolvedValue({
      status: 'success',
      data: aminoResponse,
    });

    const result = await createOfflineSigner(chainId).signAmino('atone1abc', aminoResponse.signed);
    expect(result).toEqual(aminoResponse);
  });

  it('throws with the handler message when the response is a failure', async () => {
    mockExecutorInstance.getCosmosKey.mockResolvedValue({
      status: 'failure',
      message: 'NOT_CONNECTED',
    });

    await expect(createOfflineSigner(chainId).getAccounts()).rejects.toThrow('NOT_CONNECTED');
  });

  it('falls back to a generic error when the failure response lacks a message', async () => {
    mockExecutorInstance.getCosmosKey.mockResolvedValue({ status: 'failure' });

    await expect(createOfflineSigner(chainId).getAccounts()).rejects.toThrow(
      'Adena Cosmos request failed',
    );
  });
});

describe('createOfflineAminoSigner', () => {
  it('omits signDirect but retains getAccounts and signAmino', () => {
    const signer = createOfflineAminoSigner('atomone-1');
    expect(typeof signer.getAccounts).toBe('function');
    expect(typeof signer.signAmino).toBe('function');
    expect('signDirect' in signer).toBe(false);
  });
});
