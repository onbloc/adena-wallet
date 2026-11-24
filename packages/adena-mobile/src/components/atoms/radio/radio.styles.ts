import { StyleSheet } from 'react-native';

import { radius, sizes, spacing } from '../../../theme';

export const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', minHeight: sizes.touchTarget },
  outer: { width: 20, height: 20, borderRadius: radius.circle, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  inner: { width: 10, height: 10, borderRadius: radius.circle },
  label: { marginLeft: spacing.space12, flexShrink: 1 },
});
