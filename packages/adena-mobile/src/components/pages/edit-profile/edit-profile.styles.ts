import { makeStyles, radius, spacing } from '../../../theme';

const AVATAR = 72;
const RING = 4;

export const useStyles = makeStyles(colors => ({
  identity: { gap: spacing.space8 },
  banner: { height: 96, borderRadius: radius.surface, backgroundColor: colors.background.subtle },
  avatarAnchor: { marginTop: -(AVATAR / 2 + RING), marginLeft: spacing.space16, alignSelf: 'flex-start' },
  avatarRing: { padding: RING, borderRadius: radius.circle, backgroundColor: colors.background.canvas },
  badge: { position: 'absolute', right: -spacing.space8, bottom: -spacing.space4, borderRadius: radius.circle, borderWidth: 2, borderColor: colors.background.canvas },
}));

export const AVATAR_SIZE = AVATAR;
