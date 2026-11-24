import { StyleSheet } from 'react-native';

import { sizes, spacing } from '../../../theme';

export const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', minHeight: sizes.touchTarget },
  box: { width: 20, height: 20, borderRadius: 4, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  dash: { width: 10, height: 2, borderRadius: 1 },
  label: { marginLeft: spacing.space12, flexShrink: 1 },
});
