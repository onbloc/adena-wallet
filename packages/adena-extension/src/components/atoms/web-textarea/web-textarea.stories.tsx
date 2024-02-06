import React from 'react';
import { Meta, StoryObj } from '@storybook/react';
import { WebTextarea } from '.';

export default {
  title: 'components/atoms/WebTextarea',
  component: WebTextarea,
} as Meta<typeof WebTextarea>;

export const Default: StoryObj<typeof WebTextarea> = {
  args: {},
  render: (args) => (
    <WebTextarea
      {...args}
      placeholder='placeholder'
    />
  ),
};