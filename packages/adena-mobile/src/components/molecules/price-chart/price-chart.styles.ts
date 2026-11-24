import { StyleSheet } from 'react-native';

import { spacing } from '../../../theme';

export const CHART_HEIGHT = 120;
export const CHART_PADDING = 6;

export const styles = StyleSheet.create({
  container: { height: CHART_HEIGHT, alignSelf: 'stretch' },
  dimmed: { opacity: 0.35 },
  overlay: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.space16 },
});
