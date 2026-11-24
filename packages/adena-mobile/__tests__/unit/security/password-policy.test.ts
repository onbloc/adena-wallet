import {
  BackupPasswordStrength,
  evaluateBackupPassword,
  evaluatePassword,
  findBackupPasswordIssue,
  findPasswordIssue,
  PasswordIssue,
  PasswordStrength,
} from '../../../src/security/password-policy';

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

describe('backup password policy (offline guessing)', () => {
  it('needs 12+ characters and zxcvbn 3+, which the wallet policy does not', () => {
    // Accepted as a wallet password, refused for a backup.
    expect(findPasswordIssue('sunshine2024!')).toBeNull();
    expect(findBackupPasswordIssue('sunshine2024!')).toBe(PasswordIssue.TOO_SIMPLE);
    expect(findBackupPasswordIssue('orbit lan 4')).toBe(PasswordIssue.WRONG_LENGTH);
    expect(findBackupPasswordIssue('x'.repeat(257))).toBe(PasswordIssue.WRONG_LENGTH);
    expect(findBackupPasswordIssue('')).toBe(PasswordIssue.EMPTY);
    expect(findBackupPasswordIssue('tangerine kayak', { confirm: 'other' })).toBe(PasswordIssue.NOT_MATCH);
    expect(findBackupPasswordIssue('tangerine kayak', { confirm: 'tangerine kayak' })).toBeNull();
  });

  it('labels a password weak exactly when the policy rejects it', () => {
    for (const password of ['sunshine2024!', 'orbit lan 4', 'abcdefghijkl', 'tangerine kayak', 'violet orbit lantern 42', 'zebra']) {
      const evaluation = evaluateBackupPassword(password);

      expect(evaluation.valid).toBe(findBackupPasswordIssue(password) === null);
      expect(evaluation.strength === BackupPasswordStrength.WEAK).toBe(!evaluation.valid);
    }

    expect(evaluateBackupPassword('tangerine kayak').strength).toBe(BackupPasswordStrength.GOOD);
    expect(evaluateBackupPassword('violet orbit lantern 42').strength).toBe(BackupPasswordStrength.STRONG);
  });
});
