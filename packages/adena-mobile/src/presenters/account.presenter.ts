import { Account, AvatarColor, isAvatarColor } from '../domain/account';

// Drops unknown stored values (older or newer builds) so they render the default avatar.
export const toAvatarColor = (account?: Pick<Account, 'avatarColor'> | null): AvatarColor | undefined =>
  isAvatarColor(account?.avatarColor) ? account.avatarColor : undefined;
