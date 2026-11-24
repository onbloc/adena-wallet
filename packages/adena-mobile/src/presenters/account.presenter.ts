import { Account, isAvatarColor } from '../domain/account';
import { avatarColors } from '../theme';

// Resolves a stored avatar color; unknown values (older or newer builds) use the default avatar.
export const toAvatarColor = (account?: Pick<Account, 'avatarColor'> | null): string | undefined =>
  isAvatarColor(account?.avatarColor) ? avatarColors[account.avatarColor] : undefined;
