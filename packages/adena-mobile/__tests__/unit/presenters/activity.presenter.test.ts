import { AmountTone } from '../../../src/components/view-models';
import { Activity, ActivityDirection, ActivityStatus, ActivityType } from '../../../src/domain/activity';
import { ChainFamily, Network } from '../../../src/domain/network';
import { Token, TokenType } from '../../../src/domain/token';
import {
  activityNetworkLabel,
  dateSectionTitle,
  findActivityToken,
  formatActivityAmount,
  formatDateTime,
  groupActivities,
  toActivitySectionViews,
  toActivityView,
} from '../../../src/presenters/activity.presenter';

const GNOT: Token = { id: 'ugnot', networkId: 'n', family: ChainFamily.GNO, type: TokenType.NATIVE, name: 'Gno', symbol: 'GNOT', decimals: 6, denom: 'ugnot', isNative: true };
const FOO: Token = { id: 'gno.land/r/demo/foo.FOO', networkId: 'n', family: ChainFamily.GNO, type: TokenType.GRC20, name: 'Foo', symbol: 'FOO', decimals: 4, pkgPath: 'gno.land/r/demo/foo', isNative: false };
const DECOY: Token = { ...FOO, id: 'decoy', type: TokenType.NATIVE, symbol: 'DECOY' };
const TOKENS = [GNOT, FOO];

const local = (y: number, m: number, d: number, h = 12, min = 0): string => new Date(y, m - 1, d, h, min).toISOString();

const activity = (overrides: Partial<Activity> = {}): Activity => ({
  hash: 'h1',
  type: ActivityType.TRANSFER,
  title: 'Send',
  status: ActivityStatus.SUCCESS,
  direction: ActivityDirection.OUT,
  amount: { value: '1500000', denom: 'ugnot' },
  from: 'g1from000000000000000000000000000000000',
  to: 'g1to00000000000000000000000000000000000z',
  timestamp: local(2024, 3, 5, 9, 7),
  ...overrides,
});

describe('findActivityToken', () => {
  it('matches by id, denom, then GRC20 package path', () => {
    expect(findActivityToken('ugnot', TOKENS)).toBe(GNOT);
    expect(findActivityToken('gno.land/r/demo/foo.FOO', TOKENS)).toBe(FOO);
    expect(findActivityToken('gno.land/r/demo/foo', TOKENS)).toBe(FOO);
    expect(findActivityToken('ugnot', [{ ...GNOT, id: 'other' }])?.id).toBe('other');
  });

  it('ignores package paths on non-GRC20 tokens', () => {
    expect(findActivityToken('gno.land/r/demo/foo', [DECOY])).toBeUndefined();
    expect(findActivityToken('x', [])).toBeUndefined();
  });
});

describe('formatActivityAmount', () => {
  it('formats known tokens', () => {
    expect(formatActivityAmount({ value: '1500000', denom: 'ugnot' }, TOKENS)).toBe('1.5 GNOT');
    expect(formatActivityAmount({ value: '12345', denom: 'gno.land/r/demo/foo' }, TOKENS)).toBe('1.2345 FOO');
  });

  it('keeps raw values and the last path segment for unknown denoms', () => {
    expect(formatActivityAmount({ value: '7', denom: 'gno.land/r/demo/nft' }, TOKENS)).toBe('7 nft');
    expect(formatActivityAmount({ value: '7', denom: 'uatom' }, [])).toBe('7 uatom');
    expect(formatActivityAmount({ value: '7', denom: '' }, [])).toBe('7 ');
  });
});

describe('formatDateTime', () => {
  it('formats local date and time with zero padding', () => {
    expect(formatDateTime(local(2024, 3, 5, 9, 7))).toBe('2024-03-05 09:07');
    expect(formatDateTime(local(2024, 12, 31, 23, 59))).toBe('2024-12-31 23:59');
  });

  it.each([undefined, '', 'not a date'])('returns undefined for %p', (value) => {
    expect(formatDateTime(value)).toBeUndefined();
  });
});

describe('dateSectionTitle', () => {
  const now = new Date(2024, 2, 10, 0, 30);

  it('names today and yesterday', () => {
    expect(dateSectionTitle(local(2024, 3, 10, 23, 59), now)).toBe('Today');
    expect(dateSectionTitle(local(2024, 3, 9, 0, 0), now)).toBe('Yesterday');
  });

  it('formats older and future dates', () => {
    expect(dateSectionTitle(local(2024, 3, 8), now)).toBe('2024-03-08');
    expect(dateSectionTitle(local(2024, 3, 11), now)).toBe('2024-03-11');
  });

  it('handles missing and invalid dates', () => {
    expect(dateSectionTitle(undefined, now)).toBe('Unknown date');
    expect(dateSectionTitle('garbage', now)).toBe('Unknown date');
  });

  it('defaults now to the current time', () => {
    expect(dateSectionTitle(new Date().toISOString())).toBe('Today');
  });
});

describe('toActivityView', () => {
  it('builds an outgoing transfer view', () => {
    const item = activity();

    expect(toActivityView(item, TOKENS)).toEqual({
      key: 'h1',
      title: 'Send',
      description: 'To: g1to00…000z',
      amountLabel: '-1.5 GNOT',
      tone: AmountTone.DEFAULT,
      statusLabel: 'Confirmed',
      dateLabel: '2024-03-05 09:07',
      extraInfo: undefined,
      activity: item,
    });
  });

  it('builds an incoming transfer view', () => {
    const view = toActivityView(activity({ direction: ActivityDirection.IN }), TOKENS);

    expect(view.description).toBe('From: g1from…0000');
    expect(view.amountLabel).toBe('+1.5 GNOT');
    expect(view.tone).toBe(AmountTone.POSITIVE);
  });

  it('uses no sign for direction NONE and typeName for non-transfers', () => {
    const view = toActivityView(activity({ type: ActivityType.CONTRACT_CALL, typeName: 'Swap', direction: ActivityDirection.NONE, extraInfo: '+1' }), TOKENS);

    expect(view.description).toBe('Swap');
    expect(view.amountLabel).toBe('1.5 GNOT');
    expect(view.extraInfo).toBe('+1');
  });

  it('falls back to typeName when a transfer has no counterparty', () => {
    expect(toActivityView(activity({ to: undefined, typeName: 'Transfer' }), TOKENS).description).toBe('Transfer');
  });

  it.each([undefined, { value: '', denom: 'ugnot' }, { value: '0', denom: 'ugnot' }])('omits the amount for %p', (amount) => {
    expect(toActivityView(activity({ amount }), TOKENS).amountLabel).toBeUndefined();
  });

  it('mutes failed activities', () => {
    const view = toActivityView(activity({ status: ActivityStatus.FAIL, direction: ActivityDirection.IN, timestamp: undefined }), TOKENS);

    expect(view.tone).toBe(AmountTone.MUTED);
    expect(view.statusLabel).toBe('Failed');
    expect(view.dateLabel).toBeUndefined();
  });
});

describe('groupActivities', () => {
  const now = new Date(2024, 2, 10, 12);

  it('groups by section title in input order', () => {
    const sections = groupActivities([
      activity({ hash: 'a', timestamp: local(2024, 3, 10) }),
      activity({ hash: 'b', timestamp: local(2024, 3, 9) }),
      activity({ hash: 'c', timestamp: local(2024, 3, 10, 1) }),
      activity({ hash: 'd', timestamp: undefined }),
    ], TOKENS, now);

    expect(sections.map(section => [section.title, section.items.map(item => item.key)])).toEqual([
      ['Today', ['a', 'c']],
      ['Yesterday', ['b']],
      ['Unknown date', ['d']],
    ]);
  });

  it('returns no sections for no activities', () => {
    expect(groupActivities([], TOKENS)).toEqual([]);
  });
});

describe('activityNetworkLabel', () => {
  it('joins chain and network names', () => {
    expect(activityNetworkLabel({ chainName: 'Gno.land', networkName: 'Mainnet' } as Network)).toBe('Gno.land Mainnet');
  });
});

describe('toActivitySectionViews', () => {
  it('maps items to list views with icons', () => {
    const types = [ActivityType.TRANSFER, ActivityType.TRANSFER_GRC721, ActivityType.ADD_PACKAGE, ActivityType.CONTRACT_CALL, ActivityType.MULTI_CONTRACT_CALL];
    const items = types.map((type, index) => toActivityView(activity({ hash: String(index), type, status: index === 0 ? ActivityStatus.FAIL : ActivityStatus.SUCCESS, extraInfo: 'x' }), TOKENS));
    const [section] = toActivitySectionViews([{ title: 'Today', items }]);

    expect(section.title).toBe('Today');
    expect(section.items.map(item => item.icon)).toEqual(['swap', 'swap', 'plus', 'link', 'link']);
    expect(section.items[0]).toEqual({
      key: '0',
      title: 'Send',
      description: 'To: g1to00…000z',
      amountLabel: '-1.5 GNOT',
      tone: AmountTone.MUTED,
      failed: true,
      extraInfo: 'x',
      icon: 'swap',
    });
    expect(section.items[1].failed).toBe(false);
  });

  it('maps empty input', () => {
    expect(toActivitySectionViews([])).toEqual([]);
  });
});
