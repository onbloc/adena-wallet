import { StyleSheet } from 'react-native';

import { sizes, spacing } from '../../../theme';

export const styles = StyleSheet.create({
  bar: {
    height: sizes.topBar,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: sizes.screenInset,
    gap: spacing.space4,
  },
  title: { flexShrink: 1, paddingHorizontal: spacing.space8 },
  // Without a leading control the title aligns with the content edge.
  titleFlush: { paddingLeft: 0 },
  trailing: { marginLeft: 'auto', flexDirection: 'row', alignItems: 'center', gap: spacing.space8 },
});
