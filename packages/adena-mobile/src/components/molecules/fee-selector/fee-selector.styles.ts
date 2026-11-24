import { StyleSheet } from 'react-native';

import { spacing } from '../../../theme';

export const styles = StyleSheet.create({
  container: { gap: spacing.space8 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.space8 },
});
