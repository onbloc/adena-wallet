import { StyleSheet } from 'react-native';

import { spacing } from '../../../theme';

export const styles = StyleSheet.create({
  backups: { gap: spacing.space8 },
  option: { flexDirection: 'row', alignItems: 'center', gap: spacing.space8 },
  optionLabel: { flex: 1 },
  loading: { alignItems: 'center', paddingVertical: spacing.space32 },
});
