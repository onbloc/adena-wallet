import { mapTransactionEdgeByAddress } from './transaction-history-query.mapper';

const SENDER = 'g1jg8mtutu9khhfwc4nxmuhcpftf0pajdhfvsqf5';
const RECIPIENT = 'g1kcdd3n0d472g2p5l8svyg9t0wq6h5857nq992f';
const TOKEN_PATH = 'gno.land/r/gnoland/wugnot.wugnot';

function makeTransferEvent(attrs: { key: string; value: string }[]): unknown {
  return { type: 'Transfer', pkg_path: 'gno.land/p/demo/tokens/grc20', attrs };
}

// A GRC20 transfer routed through grc20reg: MsgRun carries no func/args, so the
// Transfer event is the only description of what moved.
function makeMsgRunTransaction(events: unknown[]): any {
  return {
    hash: 'hash',
    index: 0,
    success: true,
    block_height: 1,
    gas_wanted: 1,
    gas_used: 1,
    gas_fee: { amount: 1000, denom: 'ugnot' },
    messages: [{ typeUrl: 'run', value: { caller: SENDER } }],
    response: { events },
  };
}

describe('mapTransactionEdgeByAddress: MsgRun GRC20 transfer', () => {
  const tx = makeMsgRunTransaction([
    makeTransferEvent([
      { key: 'token', value: `${TOKEN_PATH}.0` },
      { key: 'from', value: SENDER },
      { key: 'to', value: RECIPIENT },
      { key: 'value', value: '1000' },
    ]),
  ]);

  it('renders as a send for the sender', () => {
    const mapped = mapTransactionEdgeByAddress(tx, SENDER);

    expect(mapped).toMatchObject({
      type: 'TRANSFER',
      title: 'Send',
      typeName: 'Send',
      valueType: 'DEFAULT',
      originFrom: SENDER,
      originTo: RECIPIENT,
      amount: { value: '1000', denom: TOKEN_PATH },
    });
  });

  it('renders as a receive for the recipient', () => {
    const mapped = mapTransactionEdgeByAddress(tx, RECIPIENT);

    expect(mapped).toMatchObject({
      type: 'TRANSFER',
      title: 'Receive',
      typeName: 'Receive',
      valueType: 'ACTIVE',
      originFrom: SENDER,
      originTo: RECIPIENT,
    });
  });

  it('picks the transfer the viewer took part in when several are emitted', () => {
    const OTHER = 'g1v9kxjcm9ta047h6lta047h6lta047h6lzd40gh';
    const OTHER_TOKEN = 'gno.land/r/demo/defi/foo20.FOO';
    const multiTx = makeMsgRunTransaction([
      makeTransferEvent([
        { key: 'token', value: `${OTHER_TOKEN}.0` },
        { key: 'from', value: SENDER },
        { key: 'to', value: OTHER },
        { key: 'value', value: '7' },
      ]),
      makeTransferEvent([
        { key: 'token', value: `${TOKEN_PATH}.0` },
        { key: 'from', value: OTHER },
        { key: 'to', value: RECIPIENT },
        { key: 'value', value: '1000' },
      ]),
    ]);

    expect(mapTransactionEdgeByAddress(multiTx, RECIPIENT)).toMatchObject({
      title: 'Receive',
      originFrom: OTHER,
      originTo: RECIPIENT,
      amount: { value: '1000', denom: TOKEN_PATH },
    });
  });

  // The initiating side wins, as it does for bank.MsgSend and MsgCall.
  it('renders a self-transfer as a send', () => {
    const selfTx = makeMsgRunTransaction([
      makeTransferEvent([
        { key: 'token', value: `${TOKEN_PATH}.0` },
        { key: 'from', value: SENDER },
        { key: 'to', value: SENDER },
        { key: 'value', value: '1000' },
      ]),
    ]);

    expect(mapTransactionEdgeByAddress(selfTx, SENDER)).toMatchObject({
      title: 'Send',
      typeName: 'Send',
      valueType: 'DEFAULT',
    });
  });

  // GRC721 emits Transfer with `tokenId` instead of `value`.
  it('leaves a GRC721 transfer as a contract interaction', () => {
    const nftTx = makeMsgRunTransaction([
      makeTransferEvent([
        { key: 'token', value: 'gno.land/r/demo/nft.NFT.0' },
        { key: 'from', value: SENDER },
        { key: 'to', value: RECIPIENT },
        { key: 'tokenId', value: '1' },
      ]),
    ]);

    expect(mapTransactionEdgeByAddress(nftTx, RECIPIENT)).toMatchObject({
      type: 'CONTRACT_CALL',
      title: 'Message Run',
    });
  });
});
