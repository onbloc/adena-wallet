import { StyleSheet } from 'react-native';

import { spacing } from '../../../theme';

export const styles = StyleSheet.create({
  amount: { alignItems: 'center', gap: spacing.space4 },
  amountRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.space12, alignSelf: 'stretch' },
  amountLabel: { flexShrink: 1 },
  recipient: { gap: spacing.space4, paddingVertical: spacing.space8 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: spacing.space16, paddingTop: spacing.space8 },
  totalValue: { flexShrink: 1, textAlign: 'right' },
});
