import { makeStyles, radius, sizes, spacing } from '../../../theme';

export const useStyles = makeStyles(colors => ({
  // Pills share the row width equally, as in the token details design.
  row: { flexDirection: 'row', gap: spacing.space8 },
  pill: {
    flex: 1,
    height: sizes.chip,
    paddingHorizontal: 12,
    borderRadius: radius.smallControl,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background.subtle,
  },
  active: { backgroundColor: colors.action.primary },
  pressed: { backgroundColor: colors.action.secondaryPressed },
}));
