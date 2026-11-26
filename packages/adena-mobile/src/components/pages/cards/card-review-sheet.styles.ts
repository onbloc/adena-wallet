import { makeStyles, radius, spacing } from '../../../theme';

export const useStyles = makeStyles(colors => ({
  body: { gap: spacing.space16, paddingBottom: spacing.space16 },
  facts: { borderRadius: radius.sheet, backgroundColor: colors.background.subtle, paddingHorizontal: spacing.space16 },
  fact: { flexDirection: 'row', alignItems: 'center', gap: spacing.space12, paddingVertical: spacing.space16 },
  factDivider: { borderTopWidth: 1, borderTopColor: colors.border.subtle },
  factIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.circle,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background.surface,
  },
  factText: { flex: 1, gap: 2 },
  worstCase: { borderRadius: radius.sheet, backgroundColor: colors.action.primary, padding: spacing.space20, gap: spacing.space4 },
  worstCaseLabel: { color: colors.text.disabled },
  worstCaseRow: { flexDirection: 'row', alignItems: 'baseline', flexWrap: 'wrap', gap: spacing.space8 },
  worstCaseValue: { color: colors.text.inverse },
  footer: { flexDirection: 'row', gap: spacing.space12, paddingTop: spacing.space8 },
  cancel: { paddingHorizontal: spacing.space24 },
  confirm: { flex: 1 },
}));
