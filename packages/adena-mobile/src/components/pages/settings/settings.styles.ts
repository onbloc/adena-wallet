import { StyleSheet } from 'react-native';

import { spacing } from '../../../theme';

export const styles = StyleSheet.create({
  switchRow: { flexDirection: 'row', alignItems: 'center', minHeight: 52, gap: spacing.space12, paddingHorizontal: spacing.space16 },
  switchLabel: { flex: 1 },
});
