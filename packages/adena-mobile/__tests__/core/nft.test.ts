import type {GRC721CollectionModel, GRC721Model} from '@types';

import {
  classifyNftImage,
  MAX_DATA_URI_LENGTH,
  MAX_REMOTE_IMAGE_BYTES,
  mergeCollections,
  remoteImageAllowed,
  sortCollections,
  togglePinned,
} from '../../src/core/nft';
import {transferMessage} from '../../src/screens/SendConfirmScreen';

const collection = (
  packagePath: string,
  over: Partial<GRC721CollectionModel> = {},
): GRC721CollectionModel => ({
  tokenId: '1',
  networkId: 'test-1',
  display: true,
  type: 'grc721',
  packagePath,
  name: packagePath,
  symbol: 'S',
  image: null,
  isTokenUri: true,
  isMetadata: false,
  ...over,
});

describe('collections', () => {
  it('keeps the user’s display choice and appends new ones as shown', () => {
    const stored = [collection('a', {display: false, name: 'old'})];
    const merged = mergeCollections(stored, [
      collection('a', {name: 'new'}),
      collection('b', {display: false}),
    ]);
    expect(merged.map(c => [c.packagePath, c.name, c.display])).toEqual([
      ['a', 'new', false],
      ['b', 'b', true],
    ]);
  });

  it('shows pinned collections first, in pin order, and hides hidden ones', () => {
    const list = [
      collection('a'),
      collection('b'),
      collection('c', {display: false}),
      collection('d'),
    ];
    expect(
      sortCollections(list, ['d', 'c', 'b']).map(c => c.packagePath),
    ).toEqual(['d', 'b', 'a']);
  });

  it('toggles a pin', () => {
    expect(togglePinned(['a'], 'b')).toEqual(['a', 'b']);
    expect(togglePinned(['a', 'b'], 'a')).toEqual(['b']);
  });
});

describe('classifyNftImage', () => {
  it('loads https images', () => {
    expect(classifyNftImage('https://img.example/1.png')).toEqual({
      kind: 'remote',
      uri: 'https://img.example/1.png',
    });
  });

  it('keeps small inline raster images', () => {
    const uri = 'data:image/png;base64,iVBORw0KGgo=';
    expect(classifyNftImage(uri)).toEqual({kind: 'inline', uri});
  });

  it.each([
    ['empty', ''],
    ['plain http', 'http://img.example/1.png'],
    ['credentials', 'https://user@img.example/1.png'],
    ['ipfs', 'ipfs://bafy/1.png'],
    // A script URL must never reach the image view.
    // eslint-disable-next-line no-script-url
    ['javascript', 'javascript:alert(1)'],
    ['inline svg', 'data:image/svg+xml;base64,PHN2Zz4='],
    ['inline html', 'data:text/html;base64,PGgxPg=='],
    [
      'oversized inline',
      `data:image/png;base64,${'A'.repeat(MAX_DATA_URI_LENGTH)}`,
    ],
  ])('refuses %s', (_, uri) => {
    expect(classifyNftImage(uri)).toEqual({kind: 'none'});
  });
});

describe('remoteImageAllowed', () => {
  const head = (headers: Record<string, string>, ok = true) =>
    (async () => ({
      ok,
      headers: {get: (name: string) => headers[name] ?? null},
    })) as unknown as typeof fetch;

  it('allows a raster image within the size limit', async () => {
    expect(
      await remoteImageAllowed(
        'https://img.example/1.png',
        head({'content-type': 'image/png', 'content-length': '1000'}),
      ),
    ).toBe(true);
  });

  it('refuses a declared non-raster type or an oversized body', async () => {
    expect(
      await remoteImageAllowed(
        'https://img.example/1',
        head({'content-type': 'image/svg+xml'}),
      ),
    ).toBe(false);
    expect(
      await remoteImageAllowed(
        'https://img.example/1',
        head({
          'content-type': 'image/png',
          'content-length': String(MAX_REMOTE_IMAGE_BYTES + 1),
        }),
      ),
    ).toBe(false);
  });

  it('lets the image view decide when HEAD tells nothing', async () => {
    expect(
      await remoteImageAllowed('https://img.example/1', head({}, false)),
    ).toBe(true);
    const failing = (async () => {
      throw new Error('offline');
    }) as unknown as typeof fetch;
    expect(await remoteImageAllowed('https://img.example/1', failing)).toBe(
      true,
    );
  });
});

describe('transferMessage', () => {
  it('sends an NFT with TransferFrom on its collection realm', () => {
    const token = {
      packagePath: 'gno.land/r/demo/nft',
      tokenId: '7',
    } as GRC721Model;
    expect(
      transferMessage({kind: 'nft', to: 'g1to', token, memo: ''}, 'g1from'),
    ).toEqual({
      type: '/vm.m_call',
      value: {
        caller: 'g1from',
        send: '',
        max_deposit: '',
        pkg_path: 'gno.land/r/demo/nft',
        func: 'TransferFrom',
        args: ['g1from', 'g1to', '7'],
      },
    });
  });

  it('sends GNOT with a bank message', () => {
    expect(
      transferMessage(
        {kind: 'gnot', to: 'g1to', ugnot: '1500', memo: ''},
        'g1from',
      ),
    ).toEqual({
      type: '/bank.MsgSend',
      value: {from_address: 'g1from', to_address: 'g1to', amount: '1500ugnot'},
    });
  });
});
