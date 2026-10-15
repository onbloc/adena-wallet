import {validatePasswordComplexity} from '@common/validation/validation-password';

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
