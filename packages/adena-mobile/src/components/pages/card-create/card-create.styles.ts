import { makeStyles, radius, spacing } from '../../../theme';

export const useStyles = makeStyles(colors => ({
  heading: { gap: spacing.space4, marginBottom: spacing.space24 },
  section: { gap: spacing.space16 },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.space8 },
  input: { flex: 1 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.space8 },
  realm: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.space8,
    padding: spacing.space12,
    borderRadius: radius.input,
    backgroundColor: colors.background.subtle,
  },
  realmText: { flex: 1, gap: spacing.space4 },
  checking: { flexDirection: 'row', alignItems: 'center', gap: spacing.space8 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.space12, paddingVertical: spacing.space8 },
  footer: { gap: spacing.space12 },
}));
