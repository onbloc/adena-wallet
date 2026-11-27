import { makeStyles, radius, spacing } from '../../../theme';

const AVATAR = 64;
const RING = 4;
const BADGE = 44;

export const useStyles = makeStyles(colors => ({
  identity: { gap: spacing.space8 },
  banner: { height: 108, borderRadius: radius.surface, backgroundColor: colors.background.subtle },
  avatarAnchor: { marginTop: -(AVATAR / 2 + RING), marginLeft: spacing.space16, alignSelf: 'flex-start' },
  avatarRing: { padding: RING, borderRadius: radius.circle, backgroundColor: colors.background.canvas },
  // The badge hangs below the avatar; the address starts under it.
  badge: { position: 'absolute', right: -spacing.space16, bottom: -spacing.space12, borderRadius: radius.circle },
  address: { marginTop: spacing.space20 },
}));

export const AVATAR_SIZE = AVATAR;
export const BADGE_SIZE = BADGE;
