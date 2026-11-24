import { makeStyles, radius, sizes, spacing } from '../../../theme';

export const useStyles = makeStyles(colors => ({
  root: { flex: 1, backgroundColor: colors.background.canvas },
  content: { paddingHorizontal: sizes.screenInset, paddingTop: sizes.contentTop, gap: spacing.space8 },
  logo: { width: 40, height: 40, borderRadius: radius.smallControl, overflow: 'hidden', backgroundColor: colors.background.surface },
}));
