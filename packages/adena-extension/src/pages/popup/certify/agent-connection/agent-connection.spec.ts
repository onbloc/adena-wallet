import { hostBusyText, sessionNoticeText } from '.';

describe('AI Agent Connection notices', () => {
  it('says that turning agents off does not revoke sessions', () => {
    expect(sessionNoticeText(true, 0)).toContain('does not revoke them');
    expect(sessionNoticeText(false, 0)).toContain('does not revoke them');
  });

  it('counts the sessions still valid after agents are turned off', () => {
    expect(sessionNoticeText(false, 1)).toBe(
      'Agents are off, but 1 session you approved remains valid on chain until expiry or until you '
      + 'revoke them.',
    );
    expect(sessionNoticeText(false, 3)).toContain('3 sessions you approved remain valid');
  });

  it('names the browser serving agents', () => {
    expect(hostBusyText({ connected: false, updatedAt: 0, browser: 'Brave Browser' })).toContain(
      '(Brave Browser)',
    );
  });
});
