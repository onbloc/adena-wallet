import { makeStyles, radius, spacing } from '../../../theme';

export const useStyles = makeStyles(colors => ({
  row: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.space8 },
  field: {
    flex: 1,
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: spacing.space16,
    borderRadius: radius.circle,
    borderWidth: 1,
    borderColor: colors.border.input,
    backgroundColor: colors.background.surface,
  },
  fieldDisabled: { backgroundColor: colors.background.subtle },
  input: { maxHeight: 120, paddingVertical: spacing.space8, fontSize: 16, lineHeight: 22 },
}));
