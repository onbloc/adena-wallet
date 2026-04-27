import { Secp256k1Wallet } from '@cosmjs/amino';
import { ABCIAccount, JSONRPCProvider, Provider } from '@gnolang/tm2-js-client';

import {
  AdenaWallet,
  CosmosDocument,
  CosmosProvider,
  Document,
  HDWalletKeyring,
  MSG_SEND_AMINO_TYPE,
  txToDocument,
} from './..';

const mnemonic =
  'source bonus chronic canvas draft south burst lottery vacant surface solve popular case indicate oppose farm nothing bullet exhibit title speed wink action roast';

function makeDocument(body: string): Document {
  return {
    msgs: [
      {
        type: '/vm.m_addpkg',
        value: {
          creator: 'g1jg8mtutu9khhfwc4nxmuhcpftf0pajdhfvsqf5',
          deposit: '1ugnot',
          package: {
            name: 'hello',
            path: 'gno.land/r/demo/hello',
            files: [
              {
                name: 'hello.gno',
                body: body,
              },
            ],
          },
        },
      },
    ],
    fee: {
      amount: [
        {
          amount: '1',
          denom: 'ugnot',
        },
      ],
      gas: '5000000',
    },
    chain_id: 'dev',
    memo: '',
    account_number: '0',
    sequence: '1',
  };
}

describe('Transaction Sign', () => {
  let mockProvider: Provider;

  beforeEach(() => {
    mockProvider = new JSONRPCProvider('');
    mockProvider.getStatus = jest.fn().mockResolvedValue({
      node_info: {
        network: 'dev',
      },
    });
    const mockAccount: ABCIAccount = {
      BaseAccount: {
        address: '',
        coins: '',
        public_key: null,
        account_number: '0',
        sequence: '1'
      }
    }
    mockProvider.getAccount = jest.fn().mockResolvedValue(mockAccount);
  });

  it('default success', async () => {
    const wallet = await AdenaWallet.createByMnemonic(mnemonic);
    const body = 'package hello\n// test\n';
    const document = makeDocument(body);
    const { signed, signature } = await wallet.sign(mockProvider, document);

    const signedTx = txToDocument(signed);
    console.log(signedTx);
    expect(signature).toHaveLength(1);
  });

  it('"&" includes success', async () => {
    const wallet = await AdenaWallet.createByMnemonic(mnemonic);
    const body = 'package hello\n\nfunc main() {\n    // &\n}\n';
    const document = makeDocument(body);
    const signature = await wallet.sign(mockProvider, document);

    expect(signature.signature).toHaveLength(1);
  });

  it('">" includes success', async () => {
    const wallet = await AdenaWallet.createByMnemonic(mnemonic);
    const body = 'package hello\n\nfunc main() {\n    // >\n}\n';
    const document = makeDocument(body);
    const signature = await wallet.sign(mockProvider, document);

    expect(signature.signature).toHaveLength(1);
  });

  it('"<" includes success', async () => {
    const wallet = await AdenaWallet.createByMnemonic(mnemonic);
    const body = 'package hello\n\nfunc main() {\n    // <\n}\n';
    const document = makeDocument(body);
    const signature = await wallet.sign(mockProvider, document);

    expect(signature.signature).toHaveLength(1);
  });

  it('GOLDEN: fixed mnemonic + document yields known signature bytes', async () => {
    // Bit-equality regression. If you intentionally change the signing pipeline
    // (sign payload shape, encodeCharacterSet, etc.), regenerate by temporarily
    // printing `hex` from this test and pasting the new value here.
    const wallet = await AdenaWallet.createByMnemonic(mnemonic);
    const body = 'package hello\n// golden\n';
    const document = makeDocument(body);
    const { signature } = await wallet.sign(mockProvider, document);
    const hex = Buffer.from(signature[0].signature).toString('hex');
    expect(hex).toBe(
      '24e23d2bf56dffe045eaf5915be8c51f24084bd34fdccff9d5172d667cc0debf287c61355458553ae25d31344777c7d646315fec3d2c593016c7916682dc9f35',
    );
  });
});

describe('Cosmos AMINO Sign via AdenaWallet', () => {
  async function makeCosmosDocument(): Promise<CosmosDocument> {
    // Resolve the HD-derived atone address so the signer/message addresses match.
    const keyring = await HDWalletKeyring.fromMnemonic(mnemonic);
    const privKey = await keyring.getPrivateKey(0);
    const cosmjsWallet = await Secp256k1Wallet.fromKey(privKey, 'atone');
    const [{ address }] = await cosmjsWallet.getAccounts();

    return {
      chainId: 'atomone-1',
      fromAddress: address,
      msgs: [
        {
          type: MSG_SEND_AMINO_TYPE,
          value: {
            from_address: address,
            to_address: 'atone1qyqszqgpqyqszqgpqyqszqgpqyqszqgpwc2vge',
            amount: [{ denom: 'uphoton', amount: '1000' }],
          },
        },
      ],
      fee: {
        amount: [{ denom: 'uphoton', amount: '1000' }],
        gas: '200000',
      },
      memo: '',
      accountNumber: '42',
      sequence: '7',
    };
  }

  function makeMockCosmosProvider(): CosmosProvider & {
    getAccount: jest.Mock;
    broadcastTx: jest.Mock;
  } {
    return {
      getAccount: jest.fn().mockResolvedValue({
        address: '',
        accountNumber: '42',
        sequence: '7',
      }),
      broadcastTx: jest.fn().mockResolvedValue({
        txhash: 'HASH',
        code: 0,
        rawLog: '',
        height: '100',
      }),
    };
  }

  it('signCosmosByAccountId signs with the current HD account and matches the Part 3 GOLDEN', async () => {
    const wallet = await AdenaWallet.createByMnemonic(mnemonic);
    const document = await makeCosmosDocument();

    const signed = await wallet.signCosmosByAccountId(
      wallet.currentAccount.id,
      document,
      makeMockCosmosProvider(),
      'SIGN_MODE_LEGACY_AMINO_JSON',
    );

    // Same GOLDEN locked in src/cosmos/amino/sign-cosmos-amino.spec.ts.
    expect(Buffer.from(signed.txBytes).toString('base64')).toBe(
      'CpABCo0BChwvY29zbW9zLmJhbmsudjFiZXRhMS5Nc2dTZW5kEm0KLGF0b25lMWpnOG10dXR1OWtoaGZ3YzRueG11aGNwZnRmMHBhamRoNXNzeTdnEixhdG9uZTFxeXFzenFncHF5cXN6cWdwcXlxc3pxZ3BxeXFzenFncHdjMnZnZRoPCgd1cGhvdG9uEgQxMDAwEmkKUApGCh8vY29zbW9zLmNyeXB0by5zZWNwMjU2azEuUHViS2V5EiMKIQPhYTbbFx4y30iZNZQfBW4i+Jhj43OdCrfNSexCg5ydshIECgIIfxgHEhUKDwoHdXBob3RvbhIEMTAwMBDAmgwaQEB7POL2vYZ6A/Qumjxm0HxNAPrCoZ1NjBTqzhZ1Qod1eAChaKDeEHhHXeSdJmSSRNo4UwihxNZs76whBBD3G0c=',
    );
  });

  it('broadcastCosmosTx forwards to CosmosProvider.broadcastTx', async () => {
    const wallet = await AdenaWallet.createByMnemonic(mnemonic);
    const document = await makeCosmosDocument();
    const provider = makeMockCosmosProvider();
    const signed = await wallet.signCosmosByAccountId(
      wallet.currentAccount.id,
      document,
      provider,
      'SIGN_MODE_LEGACY_AMINO_JSON',
    );

    const result = await wallet.broadcastCosmosTx(signed, provider);

    expect(provider.broadcastTx).toHaveBeenCalledWith(
      signed.txBytes,
      'BROADCAST_MODE_SYNC',
    );
    expect(result.txhash).toBe('HASH');
  });
});
