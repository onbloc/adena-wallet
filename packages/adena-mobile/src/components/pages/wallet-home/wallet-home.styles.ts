import { StyleSheet } from 'react-native';

import { colors, sizes, spacing } from '../../../theme';

export const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background.canvas },
  topBar: { height: sizes.topBar, flexDirection: 'row', alignItems: 'center', gap: spacing.space8, paddingHorizontal: sizes.screenInset },
  identity: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.space8, minHeight: sizes.touchTarget },
  identityName: { flexShrink: 1 },
  content: { paddingHorizontal: sizes.screenInset, paddingTop: sizes.contentTop, paddingBottom: spacing.space32, gap: spacing.space12 },
  network: { flexDirection: 'row' },
  actions: { flexDirection: 'row', gap: spacing.space16, marginTop: spacing.space8 },
  action: { flex: 1 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: spacing.space16 },
  gridCell: { width: '48%' },
  loading: { paddingVertical: spacing.space32 },
});
