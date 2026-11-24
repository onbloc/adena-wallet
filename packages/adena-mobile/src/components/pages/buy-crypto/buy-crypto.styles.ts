import { StyleSheet } from 'react-native';

import { colors, radius, sizes, spacing } from '../../../theme';

export const styles = StyleSheet.create({
  amountBlock: { gap: spacing.space8 },
  amountRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.space16 },
  // Hero amount, matching the send amount page.
  amount: { flexShrink: 1, fontSize: 64, lineHeight: 72, letterSpacing: -1.6 },
  currency: {
    height: sizes.touchTarget,
    borderRadius: radius.circle,
    paddingHorizontal: spacing.space16,
    justifyContent: 'center',
    backgroundColor: colors.background.subtle,
  },
  bottom: { marginTop: 'auto', gap: spacing.space8 },
});
