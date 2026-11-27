import { makeStyles, radius, spacing, typography } from '../../../theme';

export const useStyles = makeStyles(() => ({
  box: { borderRadius: radius.surface, padding: spacing.space16, gap: spacing.space12 },
  input: { ...typography.body, minHeight: 96, padding: 0, textAlignVertical: 'top' },
  masked: { minHeight: 96, alignItems: 'flex-start', gap: spacing.space12 },
  footerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  paste: { minWidth: 112 },
  note: { paddingRight: spacing.space32 },
}));
