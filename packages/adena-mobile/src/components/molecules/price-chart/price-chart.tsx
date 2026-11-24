import React, { ReactElement, useState } from 'react';
import { LayoutChangeEvent, View } from 'react-native';
import Svg, { Circle, Line, Path } from 'react-native-svg';

import { colors } from '../../../theme';
import { Skeleton } from '../../atoms';
import { CHART_HEIGHT, CHART_PADDING, styles } from './price-chart.styles';

export interface PriceChartProps {
  values: number[];
  loading?: boolean;
  accessibilityLabel?: string;
}

// Line chart on the chart/line and chart/grid tokens, ending with a dot on the latest value.
export const PriceChart = ({ values, loading = false, accessibilityLabel }: PriceChartProps): ReactElement => {
  const [width, setWidth] = useState(0);
  const onLayout = (event: LayoutChangeEvent): void => setWidth(event.nativeEvent.layout.width);

  if (loading || values.length < 2) {
    return <View style={styles.container}><Skeleton height={CHART_HEIGHT} /></View>;
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const innerHeight = CHART_HEIGHT - CHART_PADDING * 2;
  const step = (width - CHART_PADDING * 2) / (values.length - 1);
  const points = values.map((value, index) => ({
    x: CHART_PADDING + index * step,
    y: CHART_PADDING + innerHeight - ((value - min) / span) * innerHeight,
  }));
  const path = points.map((point, index) => `${index === 0 ? 'M' : 'L'}${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(' ');
  const last = points[points.length - 1];

  return (
    <View style={styles.container} onLayout={onLayout} accessibilityRole='image' accessibilityLabel={accessibilityLabel}>
      {width > 0 && (
        <Svg width={width} height={CHART_HEIGHT}>
          <Line x1={0} x2={width} y1={CHART_HEIGHT - 1} y2={CHART_HEIGHT - 1} stroke={colors.chart.grid} strokeWidth={1} />
          <Path d={path} stroke={colors.chart.line} strokeWidth={2} fill='none' strokeLinejoin='round' strokeLinecap='round' />
          <Circle cx={last.x} cy={last.y} r={4} fill={colors.chart.line} />
        </Svg>
      )}
    </View>
  );
};
