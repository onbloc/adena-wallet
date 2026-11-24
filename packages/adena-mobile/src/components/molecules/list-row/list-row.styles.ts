import { makeStyles, radius, sizes, spacing } from '../../../theme';

export const useStyles = makeStyles(colors => ({
  row: {
    minHeight: sizes.assetRow,
    borderRadius: radius.input,
    paddingHorizontal: spacing.space12,
    paddingVertical: spacing.space8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.space12,
  },
  idle: { backgroundColor: colors.background.subtle },
  texts: { flex: 1, gap: 2 },
}));
