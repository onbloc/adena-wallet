import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import React, { ReactElement } from 'react';
import { View } from 'react-native';

import { typography } from '../../../theme';
import { Text } from './text';

const meta = {
  title: 'Atoms/Text',
  component: Text,
  args: { children: 'The quick brown fox' },
} satisfies Meta<typeof Text>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Body: Story = {};

// Every typography role from the design system.
export const Scale: Story = {
  render: (): ReactElement => (
    <View style={{ gap: 12, padding: 24 }}>
      {Object.keys(typography).map(role => (
        <Text key={role} variant={role as keyof typeof typography}>{`${role} · 11,301.85 GNOT`}</Text>
      ))}
    </View>
  ),
};
