import React, { ReactElement, useState } from 'react';
import { LayoutChangeEvent, View } from 'react-native';
import Svg, { Circle, Line, Path } from 'react-native-svg';

import { useThemeColors } from '../../../theme';
import { Skeleton, Spinner, Text } from '../../atoms';
import { CHART_HEIGHT, CHART_PADDING, styles } from './price-chart.styles';

export interface PriceChartProps {
  values: number[];
  loading?: boolean;
  // Another range is loading: the current line stays dimmed under a spinner.
  updating?: boolean;
  // Shown instead of the line when there is nothing to draw.
  emptyLabel?: string;
  accessibilityLabel?: string;
}

const GRID_LINES = [CHART_PADDING, CHART_HEIGHT / 2, CHART_HEIGHT - CHART_PADDING];

// Line chart over three grid lines (top, middle, bottom), ending with a dot on the latest value.
export const PriceChart = ({ values, loading = false, updating = false, emptyLabel = 'No price history', accessibilityLabel }: PriceChartProps): ReactElement => {
  const colors = useThemeColors();
  const [width, setWidth] = useState(0);
  const onLayout = (event: LayoutChangeEvent): void => setWidth(event.nativeEvent.layout.width);

  if (loading || (updating && values.length < 2)) {
    return <View style={styles.container}><Skeleton height={CHART_HEIGHT} /></View>;
  }

  if (values.length < 2) {
    return (
      <View style={[styles.container, styles.empty]}>
        <Text variant='meta' color='secondary'>{emptyLabel}</Text>
      </View>
    );
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min;
  const innerHeight = CHART_HEIGHT - CHART_PADDING * 2;
  const step = (width - CHART_PADDING * 2) / (values.length - 1);
  const points = values.map((value, index) => ({
    x: CHART_PADDING + index * step,
    // A flat series sits on the middle grid line.
    y: span === 0 ? CHART_HEIGHT / 2 : CHART_PADDING + innerHeight - ((value - min) / span) * innerHeight,
  }));
  const path = points.map((point, index) => `${index === 0 ? 'M' : 'L'}${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(' ');
  const last = points[points.length - 1];

  return (
    <View style={styles.container} onLayout={onLayout} accessibilityRole='image' accessibilityLabel={accessibilityLabel} accessibilityState={{ busy: updating }}>
      {width > 0 && (
        <View style={updating ? styles.dimmed : undefined}>
          <Svg width={width} height={CHART_HEIGHT}>
            {GRID_LINES.map(y => <Line key={y} x1={0} x2={width} y1={y} y2={y} stroke={colors.chart.grid} strokeWidth={1} />)}
            <Path d={path} stroke={colors.chart.line} strokeWidth={2} fill='none' strokeLinejoin='round' strokeLinecap='round' />
            <Circle cx={last.x} cy={last.y} r={4} fill={colors.chart.line} />
          </Svg>
        </View>
      )}
      {updating && (
        <View style={styles.overlay} accessibilityLabel='Updating chart'>
          <Spinner tone='muted' />
        </View>
      )}
    </View>
  );
};
