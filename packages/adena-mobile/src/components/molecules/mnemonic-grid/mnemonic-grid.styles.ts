import { makeStyles, radius, sizes, spacing } from '../../../theme';

export const useStyles = makeStyles(colors => ({
  grid: { flexDirection: 'row', flexWrap: 'wrap', columnGap: spacing.space12, rowGap: spacing.space8 },
  // Two columns: each cell takes half the row minus half the column gap.
  cell: {
    flexBasis: '45%',
    flexGrow: 1,
    maxWidth: '50%',
    minHeight: sizes.controlCompact,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.space12,
    paddingHorizontal: spacing.space12,
    borderRadius: radius.smallControl,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.background.subtle,
  },
  index: { minWidth: 20 },
}));
