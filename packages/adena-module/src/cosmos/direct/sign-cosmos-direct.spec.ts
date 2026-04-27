import { DirectSecp256k1Wallet } from '@cosmjs/proto-signing';
import { SignDoc, TxRaw } from 'cosmjs-types/cosmos/tx/v1beta1/tx';

import { AddressKeyring } from '../../wallet/keyring/address-keyring';
import { HDWalletKeyring } from '../../wallet/keyring/hd-wallet-keyring';
import { LedgerKeyring } from '../../wallet/keyring/ledger-keyring';
import { MultisigKeyring } from '../../wallet/keyring/multisig-keyring';
import { MSG_SEND_AMINO_TYPE } from '../codec/msg-send';
import { CosmosProvider } from '../providers/cosmos-provider';
import { CosmosDocument, isDirectSignDoc } from '../types';

import { signCosmosDirect } from './sign-cosmos-direct';

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

describe('signCosmosDirect', () => {
  it('produces a SignDoc encoding byte-equal to a cosmjs DirectSecp256k1Wallet SignDoc', async () => {
    const keyring = await HDWalletKeyring.fromMnemonic(MNEMONIC);
    const privKey = await keyring.getPrivateKey(0);

    const cosmjsWallet = await DirectSecp256k1Wallet.fromKey(privKey, 'atone');
    const [{ address }] = await cosmjsWallet.getAccounts();

    const document = makeDocument({ fromAddress: address });
    document.msgs[0].value.from_address = address;

    const ours = await signCosmosDirect({
      document,
      keyring,
      cosmosProvider: makeMockProvider(),
    });

    expect(isDirectSignDoc(ours.signDoc)).toBe(true);
    if (!isDirectSignDoc(ours.signDoc)) return;

    const roundTrip = SignDoc.encode(ours.signDoc).finish();
    const reconstructed = SignDoc.encode(
      SignDoc.fromPartial({
        bodyBytes: ours.signDoc.bodyBytes,
        authInfoBytes: ours.signDoc.authInfoBytes,
        chainId: ours.signDoc.chainId,
        accountNumber: ours.signDoc.accountNumber,
      }),
    ).finish();

    expect(Buffer.from(roundTrip).equals(Buffer.from(reconstructed))).toBe(true);
  });

  it('matches @cosmjs/proto-signing DirectSecp256k1Wallet signature bit-equal', async () => {
    const keyring = await HDWalletKeyring.fromMnemonic(MNEMONIC);
    const privKey = await keyring.getPrivateKey(0);

    const cosmjsWallet = await DirectSecp256k1Wallet.fromKey(privKey, 'atone');
    const [{ address }] = await cosmjsWallet.getAccounts();

    const document = makeDocument({ fromAddress: address });
    document.msgs[0].value.from_address = address;

    const ours = await signCosmosDirect({
      document,
      keyring,
      cosmosProvider: makeMockProvider(),
    });

    if (!isDirectSignDoc(ours.signDoc)) {
      throw new Error('expected DIRECT signDoc');
    }

    const { signature: cosmjsSig } = await cosmjsWallet.signDirect(
      address,
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
    const cosmjsWallet = await DirectSecp256k1Wallet.fromKey(
      await keyring.getPrivateKey(0),
      'atone',
    );
    const [{ address }] = await cosmjsWallet.getAccounts();

    const document = makeDocument({ fromAddress: address });
    document.msgs[0].value.from_address = address;

    const { txBytes } = await signCosmosDirect({
      document,
      keyring,
      cosmosProvider: makeMockProvider(),
    });

    expect(Buffer.from(txBytes).toString('base64')).toBe(
      'CpABCo0BChwvY29zbW9zLmJhbmsudjFiZXRhMS5Nc2dTZW5kEm0KLGF0b25lMWpnOG10dXR1OWtoaGZ3YzRueG11aGNwZnRmMHBhamRoNXNzeTdnEixhdG9uZTFxeXFzenFncHF5cXN6cWdwcXlxc3pxZ3BxeXFzenFncHdjMnZnZRoPCgd1cGhvdG9uEgQxMDAwEmkKUApGCh8vY29zbW9zLmNyeXB0by5zZWNwMjU2azEuUHViS2V5EiMKIQPhYTbbFx4y30iZNZQfBW4i+Jhj43OdCrfNSexCg5ydshIECgIIARgHEhUKDwoHdXBob3RvbhIEMTAwMBDAmgwaQFxLyj30g6enQnuYnFSvuH2Ys/7Yw2Guelui2ICDkOd1LFKQlIDhg/0qz3n37RDejG1kJvyvk8Q9EaKcgd2/6aQ=',
    );
  });

  it('fetches accountNumber and sequence from provider when missing from document', async () => {
    const keyring = await HDWalletKeyring.fromMnemonic(MNEMONIC);
    const cosmjsWallet = await DirectSecp256k1Wallet.fromKey(
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

    const signed = await signCosmosDirect({
      document,
      keyring,
      cosmosProvider: provider,
    });

    expect(provider.getAccount).toHaveBeenCalledWith(address);
    if (!isDirectSignDoc(signed.signDoc)) {
      throw new Error('expected DIRECT signDoc');
    }
    expect(signed.signDoc.accountNumber).toBe(99n);
  });

  it('throws forward-looking message for Ledger keyring', async () => {
    const keyring = new LedgerKeyring({});
    await expect(
      signCosmosDirect({
        document: makeDocument(),
        keyring,
        cosmosProvider: makeMockProvider(),
      }),
    ).rejects.toThrow(/Phase 7/);
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
      signCosmosDirect({
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
      signCosmosDirect({
        document: makeDocument(),
        keyring,
        cosmosProvider: makeMockProvider(),
      }),
    ).rejects.toThrow();
  });
});
