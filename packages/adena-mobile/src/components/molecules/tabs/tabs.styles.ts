import { fontFamily, makeStyles, sizes, spacing } from '../../../theme';

export const useStyles = makeStyles(colors => ({
  row: { flexDirection: 'row', gap: spacing.space24 },
  tab: {
    height: sizes.tab,
    paddingHorizontal: spacing.space8,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  active: { borderBottomColor: colors.border.focus },
  label: { fontFamily: fontFamily.medium },
  activeLabel: { fontFamily: fontFamily.semiBold },
}));
