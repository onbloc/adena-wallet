import { makeStyles, radius, spacing } from '../../../theme';

export const useStyles = makeStyles(colors => ({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.space12,
    paddingVertical: spacing.space24,
    paddingHorizontal: spacing.space16,
    borderRadius: radius.surface,
    backgroundColor: colors.background.subtle,
  },
  pressed: { backgroundColor: colors.background.pressed },
  disabled: { opacity: 0.5 },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: radius.input,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background.canvas,
  },
  texts: { flex: 1, gap: spacing.space4 },
  description: { fontSize: 14, lineHeight: 18 },
}));
