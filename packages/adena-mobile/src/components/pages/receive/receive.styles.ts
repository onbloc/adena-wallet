import { StyleSheet } from 'react-native';

import { spacing } from '../../../theme';

export const styles = StyleSheet.create({
  qr: { alignItems: 'center', paddingVertical: spacing.space16 },
  identity: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  actions: { flexDirection: 'row', gap: spacing.space8 },
  action: { flex: 1 },
});
