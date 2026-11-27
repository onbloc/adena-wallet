import { makeStyles, radius, spacing } from '../../../theme';

export const useStyles = makeStyles(colors => ({
  list: { gap: spacing.space12 },
  row: {
    minHeight: 104,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.space12,
    paddingHorizontal: spacing.space16,
    paddingVertical: spacing.space16,
    borderRadius: radius.surface,
    backgroundColor: colors.background.subtle,
  },
  rowPressed: { backgroundColor: colors.background.pressed },
  texts: { flex: 1, gap: spacing.space4 },
  address: { fontSize: 14 },
  trailing: { alignItems: 'flex-end', gap: spacing.space12 },
  check: { width: 24, height: 24, borderRadius: 6, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
}));
