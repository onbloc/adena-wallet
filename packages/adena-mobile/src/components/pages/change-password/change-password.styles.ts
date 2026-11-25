import { StyleSheet } from 'react-native';

import { spacing } from '../../../theme';

export const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', minHeight: 52, gap: spacing.space12 },
  label: { flex: 1 },
  strength: { marginTop: -spacing.space4 },
});
