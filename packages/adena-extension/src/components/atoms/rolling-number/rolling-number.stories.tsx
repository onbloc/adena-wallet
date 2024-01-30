import { Meta, StoryObj } from '@storybook/react';
import RollingNumber from '.';

export default {
  title: 'components/atoms/RollingNumber',
  component: RollingNumber,
} as Meta<typeof RollingNumber>;

export const Default: StoryObj<typeof RollingNumber> = {
  args: {
    value: 3,
    type: 'body6',
    color: '#FBC224',
  },
};