import { makeStyles, radius, sizes, spacing, typography } from '../../../theme';

export const useStyles = makeStyles(colors => ({
  field: {
    minHeight: sizes.control,
    borderRadius: radius.input,
    paddingLeft: spacing.space12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.space8,
    backgroundColor: colors.background.pressed,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  focused: { borderColor: colors.border.focus, backgroundColor: colors.background.surface },
  input: { ...typography.body, flex: 1, paddingVertical: 0 },
}));
