import { makeStyles, radius, sizes, spacing, typography } from '../../../theme';

export const useStyles = makeStyles(colors => ({
  container: { gap: spacing.space8 },
  field: {
    minHeight: sizes.control,
    borderRadius: radius.input,
    paddingHorizontal: spacing.space12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.space8,
    backgroundColor: colors.background.surface,
  },
  multiline: { alignItems: 'flex-start', paddingVertical: spacing.space12 },
  disabled: { backgroundColor: colors.action.disabled, borderColor: colors.action.disabled },
  input: { ...typography.body, flex: 1, paddingVertical: 0 },
  multilineInput: { minHeight: 96, textAlignVertical: 'top' },
}));
