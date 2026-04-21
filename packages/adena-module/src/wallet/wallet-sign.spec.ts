import { ABCIAccount, JSONRPCProvider, Provider } from '@gnolang/tm2-js-client';
import { AdenaWallet, Document, txToDocument } from './..';

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
