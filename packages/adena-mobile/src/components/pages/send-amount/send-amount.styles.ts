import { makeStyles, radius, sizes, spacing } from '../../../theme';

export const useStyles = makeStyles(colors => ({
  amountBlock: { gap: spacing.space8 },
  amountRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.space16 },
  // Hero amount, larger than the display role.
  amount: { flexShrink: 1, fontSize: 64, lineHeight: 72, letterSpacing: -1.6 },
  tokenSelector: {
    height: sizes.touchTarget,
    borderRadius: radius.circle,
    paddingLeft: spacing.space8,
    paddingRight: spacing.space12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.space8,
    backgroundColor: colors.background.subtle,
  },
  tokenSelectorPressed: { backgroundColor: colors.background.pressed },
  availableRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  keypad: { marginTop: 'auto' },
}));
