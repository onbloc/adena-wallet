import HighlightNumber, { type HighlightNumberProps } from './highlight-number';
import { Meta, StoryObj } from '@storybook/react';

export default {
  title: 'components/common/HighlightNumber',
  component: HighlightNumber,
} as Meta<typeof HighlightNumber>;

export const Default: StoryObj<HighlightNumberProps> = {
  args: {
    value: '123,456,789.0001',
    fontColor: 'white',
    fontStyleKey: 'header6',
    minimumFontSize: '14px',
  },
};
