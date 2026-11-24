import { makeStyles, radius, sizes, spacing } from '../../../theme';

export const useStyles = makeStyles(colors => ({
  row: {
    minHeight: sizes.assetRow,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.space12,
    paddingHorizontal: spacing.space12,
    borderRadius: radius.input,
    backgroundColor: colors.background.subtle,
  },
  texts: { flex: 1, gap: 2 },
}));
