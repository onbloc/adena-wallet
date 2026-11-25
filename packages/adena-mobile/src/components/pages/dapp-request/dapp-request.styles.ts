import { StyleSheet } from 'react-native';

import { spacing } from '../../../theme';

export const styles = StyleSheet.create({
  origin: { gap: spacing.space4 },
  actions: { flexDirection: 'row', gap: spacing.space8 },
  action: { flex: 1 },
});
