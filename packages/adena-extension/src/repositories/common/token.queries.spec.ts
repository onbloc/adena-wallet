import { Grc20TokenPackage } from '@common/utils/grc20reg-config';
import { Grc721TokenPackage, GRC721_TOKEN_PACKAGES } from '@common/utils/grc721-config';
import {
  makeAllTransferEventsQueryBy,
  makeGRC721NewTokenEventsQuery,
  makeGRC721ReceivedTokensQuery,
} from './token.queries';

const V0: Grc20TokenPackage = {
  path: 'gno.land/p/nt/grc20/v0',
  transferEvent: {
    type: 'Transfer',
    tokenAttr: 'token',
    fromAttr: 'from',
    toAttr: 'to',
    valueAttr: 'value',
  },
};

// A hypothetical later version that renames the event and its attributes.
const V1: Grc20TokenPackage = {
  path: 'gno.land/p/nt/grc20/v1',
  transferEvent: {
    type: 'Transferred',
    tokenAttr: 'id',
    fromAttr: 'sender',
    toAttr: 'recipient',
    valueAttr: 'amount',
  },
};

describe('makeAllTransferEventsQueryBy', () => {
  it('emits one from/to branch per grc20 version using that version event shape', () => {
    const query = makeAllTransferEventsQueryBy('g1abc', [V0, V1]);

    expect(query).toContain('pkg_path: { eq: "gno.land/p/nt/grc20/v0" }');
    expect(query).toContain('pkg_path: { eq: "gno.land/p/nt/grc20/v1" }');
    expect(query).toContain('type: { eq: "Transferred" }');
    expect(query).toContain('key: { eq: "recipient" }');
    expect(query).toContain('key: { eq: "sender" }');
    // v0 still matches its own keys.
    expect(query).toContain('key: { eq: "to" }');
    expect(query).toContain('key: { eq: "from" }');
    expect(query).not.toContain('gno.land/p/demo/tokens/grc20');
  });

  it('carries no GRC721 branch: grc721 discovery has its own query', () => {
    const query = makeAllTransferEventsQueryBy('g1abc', [V0]);
    expect(query).not.toContain('grc721');
  });
});

describe('makeGRC721NewTokenEventsQuery', () => {
  it('matches the NewToken event of every configured grc721 package', () => {
    const query = makeGRC721NewTokenEventsQuery(GRC721_TOKEN_PACKAGES);

    expect(query).toContain('pkg_path: { eq: "gno.land/p/nt/grc721/v0" }');
    expect(query).toContain('type: { eq: "NewToken" }');
  });

  it('uses the event names of the package it is given', () => {
    const legacy: Grc721TokenPackage = {
      path: 'gno.land/p/demo/grc721',
      events: {
        ...GRC721_TOKEN_PACKAGES[0].events,
        newTokenType: 'Created',
      },
    };

    const query = makeGRC721NewTokenEventsQuery([legacy]);

    expect(query).toContain('pkg_path: { eq: "gno.land/p/demo/grc721" }');
    expect(query).toContain('type: { eq: "Created" }');
  });
});

describe('makeGRC721ReceivedTokensQuery', () => {
  it('matches the transfers into the address for the realm, by token prefix', () => {
    const query = makeGRC721ReceivedTokensQuery(
      'gno.land/r/gnoswap/gnft',
      'g1abc',
      GRC721_TOKEN_PACKAGES,
    );

    expect(query).toContain('type: { eq: "Transfer" }');
    expect(query).toContain('key: { eq: "token" }');
    expect(query).toContain('value: { like: "gno.land/r/gnoswap/gnft." }');
    expect(query).toContain('key: { eq: "to" }');
    expect(query).toContain('value: { eq: "g1abc" }');
  });

  it('does not match the sending side: ownership is settled over RPC', () => {
    const query = makeGRC721ReceivedTokensQuery(
      'gno.land/r/gnoswap/gnft',
      'g1abc',
      GRC721_TOKEN_PACKAGES,
    );

    expect(query).not.toContain('key: { eq: "from" }');
  });
});
