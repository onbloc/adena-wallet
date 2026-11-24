import { StyleSheet } from 'react-native';

import { palette, radius, sizes, spacing } from '../../../theme';

export const FRAME_SIZE = 248;

export const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.neutral900 },
  overlay: { flex: 1, paddingHorizontal: sizes.screenInset },
  header: { height: sizes.topBar, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.space24 },
  frame: { width: FRAME_SIZE, height: FRAME_SIZE, borderRadius: radius.surface, borderWidth: 3, borderColor: palette.neutral0 },
  spinner: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
  footer: { paddingBottom: spacing.space24 },
});
