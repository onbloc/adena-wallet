import { allMessagesMatchAllowPaths, matchesAllowPaths } from './session-allow-paths';

const msgCall = (pkgPath: string): { type: string; value: { pkg_path: string } } => ({
  type: '/vm.m_call',
  value: { pkg_path: pkgPath },
});

const msgSend = { type: '/bank.MsgSend', value: {} };
const msgMultiSend = { type: '/bank.MsgMultiSend', value: {} };
const msgRun = { type: '/vm.m_run', value: {} };

// MsgMultiSend has no proto encoder in the wallet, so it is unsupported across
// the session layer (guard/spend/allow-paths). Both the message type and the
// "bank/multisend" entry are therefore treated as non-matching.

describe('matchesAllowPaths', () => {
  it('empty allowPaths does not match any message', () => {
    expect(matchesAllowPaths(msgCall('gno.land/r/demo'), [])).toBe(false);
  });

  it('wildcard "*" matches any message', () => {
    expect(matchesAllowPaths(msgCall('gno.land/r/demo'), ['*'])).toBe(true);
    expect(matchesAllowPaths(msgSend, ['*'])).toBe(true);
    expect(matchesAllowPaths(msgRun, ['*'])).toBe(true);
  });

  it('"bank/send" matches MsgSend', () => {
    expect(matchesAllowPaths(msgSend, ['bank/send'])).toBe(true);
  });

  it('"bank/send" does not match MsgCall', () => {
    expect(matchesAllowPaths(msgCall('gno.land/r/demo'), ['bank/send'])).toBe(false);
  });

  it('"bank/multisend" is unsupported and never matches MsgMultiSend', () => {
    expect(matchesAllowPaths(msgMultiSend, ['bank/multisend'])).toBe(false);
    expect(matchesAllowPaths(msgMultiSend, ['*'])).toBe(true);
  });

  it('"vm/exec:<path>" matches MsgCall with exact pkg_path', () => {
    expect(
      matchesAllowPaths(msgCall('gno.land/r/demo'), ['vm/exec:gno.land/r/demo']),
    ).toBe(true);
  });

  it('"vm/exec:<path>" matches MsgCall with sub-path under it', () => {
    expect(
      matchesAllowPaths(msgCall('gno.land/r/demo/sub'), ['vm/exec:gno.land/r/demo']),
    ).toBe(true);
  });

  it('"vm/exec:<path>" rejects prefix attack', () => {
    expect(
      matchesAllowPaths(msgCall('gno.land/r/demoX'), ['vm/exec:gno.land/r/demo']),
    ).toBe(false);
  });

  it('"vm/exec:<path>" does not match MsgRun', () => {
    expect(matchesAllowPaths(msgRun, ['vm/exec:gno.land/r/demo'])).toBe(false);
  });

  it('"vm/exec" without path matches any MsgCall', () => {
    expect(matchesAllowPaths(msgCall('gno.land/r/any'), ['vm/exec'])).toBe(true);
  });

  it('allMessagesMatchAllowPaths requires every message to match', () => {
    expect(
      allMessagesMatchAllowPaths([msgSend, msgCall('gno.land/r/demo')], ['bank/send']),
    ).toBe(false);
    expect(
      allMessagesMatchAllowPaths([msgSend, msgCall('gno.land/r/demo')], ['*']),
    ).toBe(true);
    expect(
      allMessagesMatchAllowPaths(
        [msgSend, msgCall('gno.land/r/demo')],
        ['bank/send', 'vm/exec:gno.land/r/demo'],
      ),
    ).toBe(true);
  });
});
