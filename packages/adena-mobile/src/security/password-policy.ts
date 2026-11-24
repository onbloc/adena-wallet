import zxcvbn from 'zxcvbn';

// Mirrors the extension (common/utils/password-utils.ts, validation-password.ts):
// zxcvbn score 2+ is required, 3+ reads as strong. Length bounds match its 8~256 rule.
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 256;
const MIN_VALID_SCORE = 2;
const STRONG_SCORE = 3;

export const PasswordStrength = {
  WEAK: 'weak',
  MEDIUM: 'medium',
  STRONG: 'strong',
} as const;

export type PasswordStrength = (typeof PasswordStrength)[keyof typeof PasswordStrength];

export const PasswordIssue = {
  EMPTY: 'EMPTY_PASSWORD',
  WRONG_LENGTH: 'WRONG_PASSWORD_LENGTH',
  TOO_SIMPLE: 'PASSWORD_TOO_SIMPLE',
  NOT_MATCH: 'NOT_MATCH_CONFIRM_PASSWORD',
  SAME_AS_CURRENT: 'EQUAL_CHANGE_PASSWORD',
} as const;

export type PasswordIssue = (typeof PasswordIssue)[keyof typeof PasswordIssue];

// Same wording as the extension's PasswordValidationError messages.
export const PASSWORD_ISSUE_MESSAGE: Record<PasswordIssue, string> = {
  EMPTY_PASSWORD: 'Password is empty',
  WRONG_PASSWORD_LENGTH: `Password must be ${PASSWORD_MIN_LENGTH}~${PASSWORD_MAX_LENGTH} characters`,
  PASSWORD_TOO_SIMPLE: 'Password is too simple.',
  NOT_MATCH_CONFIRM_PASSWORD: 'Passwords do not match',
  EQUAL_CHANGE_PASSWORD: 'You can’t use your current password',
};

export interface PasswordEvaluation {
  score: number;
  strength: PasswordStrength;
  valid: boolean;
}

export const evaluatePassword = (password: string): PasswordEvaluation => {
  const { score } = zxcvbn(password);
  const strength = score >= STRONG_SCORE
    ? PasswordStrength.STRONG
    : score >= MIN_VALID_SCORE ? PasswordStrength.MEDIUM : PasswordStrength.WEAK;

  return { score, strength, valid: score >= MIN_VALID_SCORE };
};

// First rule a new password breaks, or null when it may be used.
export const findPasswordIssue = (password: string, options: { confirm?: string; current?: string } = {}): PasswordIssue | null => {
  if (!password) {
    return PasswordIssue.EMPTY;
  }

  if (password.length < PASSWORD_MIN_LENGTH || password.length > PASSWORD_MAX_LENGTH) {
    return PasswordIssue.WRONG_LENGTH;
  }

  if (!evaluatePassword(password).valid) {
    return PasswordIssue.TOO_SIMPLE;
  }

  if (options.current !== undefined && password === options.current) {
    return PasswordIssue.SAME_AS_CURRENT;
  }

  if (options.confirm !== undefined && password !== options.confirm) {
    return PasswordIssue.NOT_MATCH;
  }

  return null;
};
