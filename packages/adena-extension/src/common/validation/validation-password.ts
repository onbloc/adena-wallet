import { PasswordValidationError } from '@common/errors';

export const validateInvalidPassword = (password: string, storedPassword: string) => {
  if (password !== storedPassword) {
    throw new PasswordValidationError('INVALID_PASSWORD');
  }
  return true;
};

export const validateWrongPasswordLength = (password: string) => {
  const REGEX_PASSWORD_LENGTH = /^.{8,256}$/;
  if (!REGEX_PASSWORD_LENGTH.test(password)) {
    throw new PasswordValidationError('WRONG_PASSWORD_LENGTH');
  }
  return true;
};

export const validateEqualsChangePassword = (newPassword: string, originPassword: string) => {
  if (newPassword === originPassword) {
    throw new PasswordValidationError('EQUAL_CHANGE_PASSWORD');
  }
  return true;
};

export const validateNotMatchConfirmPassword = (password: string, confirmPassword: string) => {
  if (password !== confirmPassword) {
    throw new PasswordValidationError('NOT_MATCH_CONFIRM_PASSWORD');
  }
  return true;
};

export const validateEmptyPassword = (password: string | undefined) => {
  if (password && password.length > 0) {
    return true;
  }
  throw new PasswordValidationError('EMPTY_PASSWORD');
};
