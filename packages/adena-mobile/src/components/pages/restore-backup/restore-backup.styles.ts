import { StyleSheet } from 'react-native';

import { sizes, spacing } from '../../../theme';

export const styles = StyleSheet.create({
  backups: { gap: spacing.space8 },
  option: { flexDirection: 'row', alignItems: 'center', gap: spacing.space8 },
  optionLabel: { flex: 1 },
  hint: { gap: spacing.space8 },
  versions: { gap: spacing.space4 },
  version: { flexDirection: 'row', alignItems: 'center', minHeight: sizes.assetRow, gap: spacing.space12 },
  versionTexts: { flex: 1, gap: 2 },
  loading: { alignItems: 'center', paddingVertical: spacing.space32 },
});
