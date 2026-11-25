import { toBase64 } from '@cosmjs/encoding';

import { Activity } from '../src/domain/activity';
import { TransactionHistoryItem } from '../src/infrastructure/http/onbloc-api.client';
import { groupActivities, toActivityView } from '../src/presenters/activity.presenter';
import { mapApiHistoryItem, toHexHash } from '../src/repositories/chain/gno/history/gno-api-history.mapper';
import { resolveImageSource } from '../src/utils/image-source';
import { API_URL, createTestContainer, TEST_MNEMONIC, TEST_PASSWORD } from './helpers/test-container';

const ME = 'g1me';
const historyItem = (overrides: Partial<TransactionHistoryItem>): TransactionHistoryItem => ({
  amountIn: { denom: 'ugnot', value: '0' },
  amountOut: { denom: 'ugnot', value: '0' },
  blockHeight: 10,
  fee: { denom: 'ugnot', value: '1000' },
  func: [{ funcType: '', messageType: '/bank.MsgSend', pkgPath: '' }],
  isGRC20Transfer: false,
  isGRC721Transfer: false,
  messageCount: 1,
  successYn: true,
  timestamp: '2026-11-20T10:00:00Z',
  fromAddress: 'g1other',
  toAddress: ME,
  txHash: 'AB'.repeat(32),
  ...overrides,
});

describe('API history mapping (extension rules)', () => {
  it('maps receives and sends with the right amount side', () => {
    expect(mapApiHistoryItem(historyItem({ amountIn: { denom: 'ugnot', value: '5' } }), ME))
      .toMatchObject({ type: 'TRANSFER', title: 'Receive', direction: 'in', amount: { value: '5', denom: 'ugnot' }, hash: 'ab'.repeat(32) });
    expect(mapApiHistoryItem(historyItem({ fromAddress: ME, toAddress: 'g1x', amountOut: { denom: 'ugnot', value: '9' } }), ME))
      .toMatchObject({ title: 'Send', direction: 'out', amount: { value: '9' } });
  });

  it('normalizes GRC20 denoms carrying an on-chain sequence', () => {
    const activity = mapApiHistoryItem(historyItem({
      func: [{ funcType: 'Transfer', messageType: '/vm.m_call', pkgPath: 'gno.land/r/gnoswap/gns' }],
      isGRC20Transfer: true,
      amountIn: { denom: 'gno.land/r/gnoswap/gns.GNS.0000000', value: '42' },
    }), ME);

    expect(activity.amount).toEqual({ value: '42', denom: 'gno.land/r/gnoswap/gns.GNS' });
  });

  it('labels multi-message, package and session transactions', () => {
    expect(mapApiHistoryItem(historyItem({ messageCount: 3, func: [{ funcType: 'Swap', messageType: '/vm.m_call', pkgPath: '' }] }), ME))
      .toMatchObject({ type: 'MULTI_CONTRACT_CALL', title: 'Swap', extraInfo: '+2' });
    expect(mapApiHistoryItem(historyItem({ func: [{ funcType: '', messageType: '/vm.m_addpkg', pkgPath: '' }] }), ME))
      .toMatchObject({ type: 'ADD_PACKAGE', title: 'AddPkg' });
    expect(mapApiHistoryItem(historyItem({ func: [{ funcType: '', messageType: '/auth.m_create_session', pkgPath: '' }] }), ME))
      .toMatchObject({ typeName: 'Session Account', title: 'Create Session' });
    expect(mapApiHistoryItem(historyItem({ successYn: false }), ME).status).toBe('FAIL');
  });

  it('converts legacy base64 hashes to hex', () => {
    expect(toHexHash(toBase64(new Uint8Array([0xde, 0xad])))).toBe('dead');
  });
});

describe('activity presenter', () => {
  const tokens = [{ id: 'ugnot', denom: 'ugnot', symbol: 'GNOT', decimals: 6 }] as never[];
  const base: Activity = { hash: 'h1', type: 'TRANSFER', title: 'Receive', status: 'SUCCESS', direction: 'in', from: 'g1jg8mtutu9khhfwc4nxmuhcpftf0pajdhfvsqf5', amount: { value: '1500000', denom: 'ugnot' }, timestamp: '2026-11-23T09:00:00' };

  it('formats amounts with token metadata and keeps NFT counts plain', () => {
    expect(toActivityView(base, tokens)).toMatchObject({ amountLabel: '+1.5 GNOT', tone: 'positive', description: 'From: g1jg8m...fvsqf5' });
    expect(toActivityView({ ...base, type: 'TRANSFER_GRC721', amount: { value: '3', denom: 'gno.land/r/x/nft' } }, tokens).amountLabel).toBe('+3 nft');
  });

  it('groups by day with Today / Yesterday titles', () => {
    const now = new Date('2026-11-23T12:00:00');
    const sections = groupActivities([base, { ...base, hash: 'h2', timestamp: '2026-11-22T08:00:00' }, { ...base, hash: 'h3', timestamp: '2026-11-01T08:00:00' }], tokens, now);

    expect(sections.map(section => section.title)).toEqual(['Today', 'Yesterday', '2026-11-01']);
  });
});

describe('NFT data', () => {
  it('groups API collections per realm and reads token URIs, rejecting error tuples', async () => {
    const env = createTestContainer();
    const account = await env.container.walletService.createWallet({ mnemonic: TEST_MNEMONIC, password: TEST_PASSWORD });
    const network = env.container.networkService.getCurrentNetwork();
    const address = env.container.accountService.getAddress(account, network);

    env.http
      .on(`${API_URL}/v1/accounts/${address}/grc721-tokens`, {
        data: {
          items: [
            { tokenId: 'gno.land/r/demo/nft.NFT.1', packagePath: 'gno.land/r/demo/nft', name: 'Demo', symbol: 'NFT', tokenCount: 2, ownedCount: 2 },
            { tokenId: 'gno.land/r/demo/empty.E.1', packagePath: 'gno.land/r/demo/empty', name: 'Empty', symbol: 'E', tokenCount: 0, ownedCount: 0 },
          ],
        },
      })
      .on(`${API_URL}/v1/accounts/${address}/grc721-tokens/${encodeURIComponent('gno.land/r/demo/nft.NFT.1')}/items?limit=20`, {
        data: { items: [{ nftId: '7', packagePath: 'gno.land/r/demo/nft', name: 'Demo', symbol: 'NFT' }], page: { hasNext: true, cursor: 'c1' } },
      });
    env.gno.state.signatures['gno.land/r/demo/nft'] = [{ FuncName: 'TokenURI', Results: [{ Type: 'string' }] }];
    env.gno.state.evaluate = (_pkg, expression) => (expression.includes('"7"')
      ? '("data:image/svg+xml;base64,PHN2Zy8+" string)\n(undefined)'
      : '("" string)\n(&errors.errorString{s:"invalid token id"} *errors.errorString)');

    const [collection, ...rest] = await env.container.nftService.getCollections(account, network);

    expect(rest).toHaveLength(0);
    expect(collection).toMatchObject({ packagePath: 'gno.land/r/demo/nft', ownedCount: 2, thumbnailNftId: '7', supportsTokenUri: true, supportsMetadata: false });
    await expect(env.container.nftService.getTokenUri(network, collection.packagePath, '7')).resolves.toBe('data:image/svg+xml;base64,PHN2Zy8+');
    await expect(env.container.nftService.getTokenUri(network, collection.packagePath, '8')).resolves.toBeNull();
  });

  it('classifies image URIs and refuses insecure schemes', () => {
    expect(resolveImageSource('data:image/svg+xml;base64,PHN2Zy8+')).toEqual({ kind: 'svg-xml', xml: '<svg/>' });
    expect(resolveImageSource('data:image/svg+xml;utf8,%3Csvg%2F%3E')).toEqual({ kind: 'svg-xml', xml: '<svg/>' });
    expect(resolveImageSource('https://x.io/a.svg')).toEqual({ kind: 'svg-uri', uri: 'https://x.io/a.svg' });
    expect(resolveImageSource('https://x.io/a.png')).toEqual({ kind: 'raster', uri: 'https://x.io/a.png' });
    expect(resolveImageSource('http://x.io/a.png')).toEqual({ kind: 'none' });
    expect(resolveImageSource('ipfs://abc')).toEqual({ kind: 'none' });
  });

  it('reports history and NFTs as unsupported without an API', async () => {
    const env = createTestContainer();
    const base = env.container.networkService.getNetwork('gnoland-1');
    const custom = { ...base, id: 'custom', apiUrl: undefined, isCustom: true };

    expect(env.container.activityService.isSupported(custom)).toBe(false);
    expect(env.container.nftService.isSupported(custom)).toBe(false);
    expect(env.container.priceService.isSupported(custom)).toBe(false);
  });
});

describe('address book, NFT preferences and transfers', () => {
  const setup = async () => {
    const env = createTestContainer();
    const account = await env.container.walletService.createWallet({ mnemonic: TEST_MNEMONIC, password: TEST_PASSWORD });

    return { ...env, account, network: env.container.networkService.getCurrentNetwork() };
  };

  it('validates entries per network and filters them by address prefix', async () => {
    const { container, network } = await setup();
    const atomone = container.networkService.getNetwork('atomone-1');

    container.addressBookService.add({ name: 'Gno friend', address: 'g1jg8mtutu9khhfwc4nxmuhcpftf0pajdhfvsqf5' }, network);
    expect(() => container.addressBookService.add({ name: 'Dup', address: 'g1jg8mtutu9khhfwc4nxmuhcpftf0pajdhfvsqf5' }, network)).toThrow('already saved');
    expect(() => container.addressBookService.add({ name: 'Bad', address: 'g1nope' }, network)).toThrow('valid');
    expect(container.addressBookService.getEntriesFor(network)).toHaveLength(1);
    expect(container.addressBookService.getEntriesFor(atomone)).toHaveLength(0);
  });

  it('orders pinned collections first and drops hidden ones', async () => {
    const { container, account, network } = await setup();
    const { NftService } = jest.requireActual('../src/services/nft.service');
    const collection = (packagePath: string, name: string) => ({ id: packagePath, packagePath, name, symbol: 'X', ownedCount: 1, supportsTokenUri: true, supportsMetadata: false });

    container.nftService.setPinned(account, network, 'gno.land/r/b', true);
    container.nftService.setHidden(account, network, 'gno.land/r/c', true);
    const arranged = NftService.arrange([collection('gno.land/r/a', 'A'), collection('gno.land/r/b', 'B'), collection('gno.land/r/c', 'C')], container.nftService.getPreferences(account, network));

    expect(arranged.map((item: { name: string }) => item.name)).toEqual(['B', 'A']);
  });

  it('builds GRC721 transfers as TransferFrom(from, to, tid)', async () => {
    const { container, account, network } = await setup();
    const from = container.accountService.getAddress(account, network);
    const draft = container.nftService.createTransferDraft(account, network, { collectionId: 'c', packagePath: 'gno.land/r/demo/nft', nftId: '7', name: 'N', symbol: 'N' }, 'g1jg8mtutu9khhfwc4nxmuhcpftf0pajdhfvsqf5');

    expect(draft.messages).toEqual([{ type: '/vm.m_call', value: { caller: from, send: '', max_deposit: '', pkg_path: 'gno.land/r/demo/nft', func: 'TransferFrom', args: [from, 'g1jg8mtutu9khhfwc4nxmuhcpftf0pajdhfvsqf5', '7'] } }]);
  });

  it('derives Gno fee tiers from one simulation like the extension', () => {
    const { computeFee, GNO_FEE_POLICY } = jest.requireActual('../src/domain/fee');
    const estimate = { gasUsed: '100000', gasPrice: '0.001', denom: 'ugnot', policy: GNO_FEE_POLICY };

    expect(computeFee(estimate, { tier: 'SLOW', adjustment: 1 })).toMatchObject({ gasWanted: '100000', gasFee: '100ugnot', tooLow: false });
    expect(computeFee(estimate, { tier: 'FAST', adjustment: 1 })).toMatchObject({ gasWanted: '120000', gasFee: '120ugnot' });
    expect(computeFee(estimate, { tier: 'CUSTOM', adjustment: 0.5 })).toMatchObject({ gasWanted: '50000', tooLow: true });
  });
});
