import { StyleSheet } from 'react-native';

import { radius, spacing } from '../../../theme';

export const styles = StyleSheet.create({
  identity: { flexDirection: 'row', alignItems: 'center', gap: spacing.space12 },
  thumbnail: { width: 48, height: 48, borderRadius: radius.circle, overflow: 'hidden' },
  names: { flex: 1, gap: 2 },
  stats: { flexDirection: 'row', gap: spacing.space12 },
  stat: { flex: 1, gap: spacing.space4 },
  row: { flexDirection: 'row', gap: spacing.space12 },
  cell: { flex: 1 },
});
