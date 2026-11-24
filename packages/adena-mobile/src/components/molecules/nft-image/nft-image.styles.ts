import { StyleSheet } from 'react-native';

import { colors, radius } from '../../../theme';

export const styles = StyleSheet.create({
  frame: { aspectRatio: 1, borderRadius: radius.input, overflow: 'hidden', backgroundColor: colors.background.subtle },
  fill: { width: '100%', height: '100%' },
  placeholder: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
