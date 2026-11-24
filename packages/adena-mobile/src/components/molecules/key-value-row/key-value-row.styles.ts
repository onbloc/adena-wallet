import { StyleSheet } from 'react-native';

import { spacing } from '../../../theme';

export const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: spacing.space16, paddingVertical: spacing.space8 },
  stacked: { flexDirection: 'column', gap: spacing.space4 },
  value: { flexShrink: 1 },
});
