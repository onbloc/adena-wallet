import { evaluatePassword, findPasswordIssue, PasswordIssue, PasswordStrength } from '../../../src/security/password-policy';

describe('password policy (extension parity)', () => {
  it('grades with zxcvbn: score 2 is medium, 3+ is strong, below 2 is rejected', () => {
    expect(evaluatePassword('password')).toMatchObject({ valid: false, strength: PasswordStrength.WEAK });
    expect(evaluatePassword('correct horse battery staple 9!').strength).toBe(PasswordStrength.STRONG);

    const medium = ['adena2026', 'gnoland77', 'mobile-wallet'].map(evaluatePassword).find(result => result.score === 2);

    if (medium) {
      expect(medium).toMatchObject({ valid: true, strength: PasswordStrength.MEDIUM });
    }
  });

  it('reports the first broken rule', () => {
    expect(findPasswordIssue('')).toBe(PasswordIssue.EMPTY);
    expect(findPasswordIssue('Ab3$xyz')).toBe(PasswordIssue.WRONG_LENGTH);
    expect(findPasswordIssue('x'.repeat(257))).toBe(PasswordIssue.WRONG_LENGTH);
    expect(findPasswordIssue('12345678')).toBe(PasswordIssue.TOO_SIMPLE);
    expect(findPasswordIssue('correct horse battery', { confirm: 'other' })).toBe(PasswordIssue.NOT_MATCH);
    expect(findPasswordIssue('correct horse battery', { current: 'correct horse battery' })).toBe(PasswordIssue.SAME_AS_CURRENT);
    expect(findPasswordIssue('correct horse battery', { confirm: 'correct horse battery' })).toBeNull();
  });
});
