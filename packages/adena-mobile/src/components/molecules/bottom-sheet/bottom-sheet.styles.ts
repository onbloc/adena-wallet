import { makeStyles, radius, spacing } from '../../../theme';

export const useStyles = makeStyles(colors => ({
  sheet: {
    backgroundColor: colors.background.surface,
    paddingHorizontal: spacing.space24,
    gap: spacing.space8,
  },
  handle: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: radius.circle,
    backgroundColor: colors.border.input,
    marginBottom: spacing.space8,
  },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.space12 },
  title: { flex: 1 },
  content: { marginTop: spacing.space8, gap: spacing.space12 },
}));
