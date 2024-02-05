import React from 'react';
import { Meta, StoryObj } from '@storybook/react';
import { WebInput } from '.';

export default {
  title: 'components/atoms/WebInput',
  component: WebInput,
} as Meta<typeof WebInput>;

export const Default: StoryObj<typeof WebInput> = {
  args: {},
  render: (args) => (
    <WebInput
      {...args}
      placeholder='placeholder'
    />
  ),
};