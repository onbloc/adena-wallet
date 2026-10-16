import {validatePasswordComplexity} from '@common/validation/validation-password';
import {evaluatePassword} from '@common/utils/password-utils';

/**
 * The extension's complexity rule. Debug builds skip it to speed up manual
 * testing; release builds always enforce it, because the password is what
 * stands between a stolen phone and the encrypted vault.
 */
export function isStrongEnoughPassword(password: string): boolean {
  if (__DEV__) {
    return password.length > 0;
  }
  try {
    return validatePasswordComplexity(password);
  } catch {
    return false;
  }
}

export type PasswordStrength = 'Strong' | 'Medium' | 'Weak';

/** The label the extension shows next to a new password (zxcvbn score). */
export function passwordStrength(password: string): PasswordStrength | null {
  if (!password) {
    return null;
  }
  const {complexity} = evaluatePassword(password);
  if (complexity === 'STRONG') {
    return 'Strong';
  }
  return complexity === 'MEDIUM' ? 'Medium' : 'Weak';
}
