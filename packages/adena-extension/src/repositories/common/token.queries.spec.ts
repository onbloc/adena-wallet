import { Grc20TokenPackage } from '@common/utils/grc20reg-config';
import { makeAllTransferEventsQueryBy } from './token.queries';

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

  it('keeps the GRC721 branches independent of the grc20 versions', () => {
    const query = makeAllTransferEventsQueryBy('g1abc', [V1]);
    expect(query).toContain('pkg_path: { eq: "gno.land/p/nt/grc721/v0" }');
    expect(query).toContain('type: { eq: "Mint" }');
  });
});
