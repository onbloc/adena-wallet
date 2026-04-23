import { Secp256k1Wallet } from '@cosmjs/amino';
import { TxRaw } from 'cosmjs-types/cosmos/tx/v1beta1/tx';

import { HDWalletKeyring } from '../../wallet/keyring/hd-wallet-keyring';
import type { LedgerConnector } from '@cosmjs/ledger-amino';

import { LedgerKeyring } from '../../wallet/keyring/ledger-keyring';
import { MultisigKeyring } from '../../wallet/keyring/multisig-keyring';
import { AddressKeyring } from '../../wallet/keyring/address-keyring';
import { MSG_SEND_AMINO_TYPE } from '../codec/msg-send';
import { CosmosProvider } from '../providers/cosmos-provider';
import { CosmosDocument } from '../types';

import { signCosmosAmino } from './sign-cosmos-amino';

const MNEMONIC =
  'source bonus chronic canvas draft south burst lottery vacant surface solve popular case indicate oppose farm nothing bullet exhibit title speed wink action roast';

function makeMockProvider(
  overrides: Partial<CosmosProvider> = {},
): CosmosProvider & { getAccount: jest.Mock; broadcastTx: jest.Mock } {
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
    simulateTx: jest.fn().mockResolvedValue({ gasUsed: 100_000 }),
    getMinGasPrices: jest
      .fn()
      .mockResolvedValue([{ denom: 'uphoton', amount: '0.01' }]),
    ...overrides,
  } as CosmosProvider & { getAccount: jest.Mock; broadcastTx: jest.Mock };
}

function makeDocument(overrides: Partial<CosmosDocument> = {}): CosmosDocument {
  return {
    chainId: 'atomone-1',
    fromAddress: 'atone1qqqsyqcyq5rqwzqfpg9scrgwpugpzysndkda8p',
    msgs: [
      {
        type: MSG_SEND_AMINO_TYPE,
        value: {
          from_address: 'atone1qqqsyqcyq5rqwzqfpg9scrgwpugpzysndkda8p',
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
    ...overrides,
  };
}

describe('signCosmosAmino', () => {
  it('matches @cosmjs/amino Secp256k1Wallet signature bit-equal', async () => {
    const keyring = await HDWalletKeyring.fromMnemonic(MNEMONIC);
    const privKey = await keyring.getPrivateKey(0);

    const cosmjsWallet = await Secp256k1Wallet.fromKey(privKey, 'atone');
    const [{ address: cosmjsAddress }] = await cosmjsWallet.getAccounts();

    const document = makeDocument({ fromAddress: cosmjsAddress });
    document.msgs[0].value.from_address = cosmjsAddress;

    const ours = await signCosmosAmino({
      document,
      keyring,
      cosmosProvider: makeMockProvider(),
    });

    const { signature: cosmjsSig } = await cosmjsWallet.signAmino(
      cosmjsAddress,
      ours.signDoc,
    );
    const cosmjsRawSig = Buffer.from(cosmjsSig.signature, 'base64');

    const ourTxRaw = TxRaw.decode(ours.txBytes);
    const ourSig = Buffer.from(ourTxRaw.signatures[0]);

    expect(ourSig.length).toBe(64);
    expect(ourSig.equals(cosmjsRawSig)).toBe(true);
  });

  it('GOLDEN: fixed mnemonic + document yields known TxRaw bytes', async () => {
    const keyring = await HDWalletKeyring.fromMnemonic(MNEMONIC);
    const cosmjsWallet = await Secp256k1Wallet.fromKey(
      await keyring.getPrivateKey(0),
      'atone',
    );
    const [{ address }] = await cosmjsWallet.getAccounts();

    const document = makeDocument({ fromAddress: address });
    document.msgs[0].value.from_address = address;

    const { txBytes } = await signCosmosAmino({
      document,
      keyring,
      cosmosProvider: makeMockProvider(),
    });

    expect(Buffer.from(txBytes).toString('base64')).toBe(
      'CpABCo0BChwvY29zbW9zLmJhbmsudjFiZXRhMS5Nc2dTZW5kEm0KLGF0b25lMWpnOG10dXR1OWtoaGZ3YzRueG11aGNwZnRmMHBhamRoNXNzeTdnEixhdG9uZTFxeXFzenFncHF5cXN6cWdwcXlxc3pxZ3BxeXFzenFncHdjMnZnZRoPCgd1cGhvdG9uEgQxMDAwEmkKUApGCh8vY29zbW9zLmNyeXB0by5zZWNwMjU2azEuUHViS2V5EiMKIQPhYTbbFx4y30iZNZQfBW4i+Jhj43OdCrfNSexCg5ydshIECgIIfxgHEhUKDwoHdXBob3RvbhIEMTAwMBDAmgwaQEB7POL2vYZ6A/Qumjxm0HxNAPrCoZ1NjBTqzhZ1Qod1eAChaKDeEHhHXeSdJmSSRNo4UwihxNZs76whBBD3G0c=',
    );
  });

  it('treats empty-string accountNumber/sequence as missing (avoids BigInt crash)', async () => {
    // Regression: prior behavior passed '' through as-is, causing
    // BigInt('') → SyntaxError deep in make-tx-raw. resolveAccount now
    // normalizes empty strings to undefined so the LCD fallback runs.
    const keyring = await HDWalletKeyring.fromMnemonic(MNEMONIC);
    const cosmjsWallet = await Secp256k1Wallet.fromKey(
      await keyring.getPrivateKey(0),
      'atone',
    );
    const [{ address }] = await cosmjsWallet.getAccounts();

    const document = makeDocument({
      fromAddress: address,
      accountNumber: '',
      sequence: '',
    });
    document.msgs[0].value.from_address = address;

    const provider = makeMockProvider();
    provider.getAccount.mockResolvedValue({
      address,
      accountNumber: '88',
      sequence: '4',
    });

    const signed = await signCosmosAmino({
      document,
      keyring,
      cosmosProvider: provider,
    });

    expect(provider.getAccount).toHaveBeenCalledWith(address);
    expect(signed.signDoc.account_number).toBe('88');
    expect(signed.signDoc.sequence).toBe('4');
  });

  it('fetches accountNumber and sequence from provider when missing from document', async () => {
    const keyring = await HDWalletKeyring.fromMnemonic(MNEMONIC);
    const cosmjsWallet = await Secp256k1Wallet.fromKey(
      await keyring.getPrivateKey(0),
      'atone',
    );
    const [{ address }] = await cosmjsWallet.getAccounts();

    const document: CosmosDocument = {
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
      fee: { amount: [{ denom: 'uphoton', amount: '1000' }], gas: '200000' },
      memo: '',
    };

    const provider = makeMockProvider();
    provider.getAccount.mockResolvedValue({
      address,
      accountNumber: '99',
      sequence: '3',
    });

    const signed = await signCosmosAmino({
      document,
      keyring,
      cosmosProvider: provider,
    });

    expect(provider.getAccount).toHaveBeenCalledWith(address);
    expect(signed.signDoc.account_number).toBe('99');
    expect(signed.signDoc.sequence).toBe('3');
  });

  it('produces a signed Cosmos tx when the keyring is a Ledger', async () => {
    // With the Phase 7 stub lifted, a Ledger keyring flows through the same
    // pipeline as HD/private-key keyrings: signRaw → 64-byte r||s →
    // makeTxRaw. We mock the connector to stay unit-scope.
    const pubkey = new Uint8Array(33).fill(0x02);
    const signature = new Uint8Array(64).fill(0x09);
    const connector = {
      sign: jest.fn().mockResolvedValue(signature),
      getPubkey: jest.fn().mockResolvedValue(pubkey),
    } as unknown as LedgerConnector;
    const keyring = new LedgerKeyring({});
    keyring.setConnector(connector);

    const signed = await signCosmosAmino({
      document: makeDocument(),
      keyring,
      cosmosProvider: makeMockProvider(),
    });

    expect(connector.sign).toHaveBeenCalledTimes(1);
    const ourTxRaw = TxRaw.decode(signed.txBytes);
    expect(Buffer.from(ourTxRaw.signatures[0]).equals(Buffer.from(signature))).toBe(true);
  });

  it('throws permanent-unsupport message for Multisig keyring', async () => {
    const keyring = new MultisigKeyring({
      addressBytes: [
        146, 15, 181, 241, 124, 45, 175, 116, 187, 21, 153, 183, 203, 224, 41, 90,
        94, 30, 201, 183,
      ],
      multisigConfig: {
        threshold: 2,
        signers: [
          'g1jg8mtutu9khhfwc4nxmuhcpftf0pajdhfvsqf5',
          'g1kcdd3n0d472g2p5l8svyg9t0wq6h5857nq992f',
        ],
      },
    });

    await expect(
      signCosmosAmino({
        document: makeDocument(),
        keyring,
        cosmosProvider: makeMockProvider(),
      }),
    ).rejects.toThrow(/[Mm]ultisig/);
  });

  it('throws for AirGap (address-only) keyring', async () => {
    const keyring = await AddressKeyring.fromAddress(
      'g1jg8mtutu9khhfwc4nxmuhcpftf0pajdhfvsqf5',
    );

    await expect(
      signCosmosAmino({
        document: makeDocument(),
        keyring,
        cosmosProvider: makeMockProvider(),
      }),
    ).rejects.toThrow();
  });
});
