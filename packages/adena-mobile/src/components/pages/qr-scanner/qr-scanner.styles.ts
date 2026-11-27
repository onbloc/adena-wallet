import { StyleSheet } from 'react-native';

import { palette, radius, spacing } from '../../../theme';

const FRAME_SIZE = 262;
const CORNER_SIZE = 80;
const CORNER_STROKE = 3;

export const styles = StyleSheet.create({
  viewport: {
    aspectRatio: 0.9,
    borderRadius: radius.sheet,
    overflow: 'hidden',
    backgroundColor: palette.neutral900,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.space32,
  },
  frame: { width: FRAME_SIZE, height: FRAME_SIZE, alignItems: 'center', justifyContent: 'center' },
  corner: { position: 'absolute', width: CORNER_SIZE, height: CORNER_SIZE, borderColor: palette.neutral0 },
  topLeft: { top: 0, left: 0, borderTopWidth: CORNER_STROKE, borderLeftWidth: CORNER_STROKE, borderTopLeftRadius: radius.sheet },
  topRight: { top: 0, right: 0, borderTopWidth: CORNER_STROKE, borderRightWidth: CORNER_STROKE, borderTopRightRadius: radius.sheet },
  bottomLeft: { bottom: 0, left: 0, borderBottomWidth: CORNER_STROKE, borderLeftWidth: CORNER_STROKE, borderBottomLeftRadius: radius.sheet },
  bottomRight: { bottom: 0, right: 0, borderBottomWidth: CORNER_STROKE, borderRightWidth: CORNER_STROKE, borderBottomRightRadius: radius.sheet },
  scanLine: { width: '72%', height: CORNER_STROKE, borderRadius: radius.circle, backgroundColor: palette.neutral0 },
  spinner: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
});
