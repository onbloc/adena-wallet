import { StyleSheet } from 'react-native';

import { spacing } from '../../../theme';

export const styles = StyleSheet.create({
  amountBlock: { gap: spacing.space8 },
  amountRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.space12 },
  amount: { flexShrink: 1 },
  availableRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  keypad: { marginTop: 'auto' },
});
