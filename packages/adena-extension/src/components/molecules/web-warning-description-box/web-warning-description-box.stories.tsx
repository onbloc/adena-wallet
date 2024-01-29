import { Meta, StoryObj } from '@storybook/react';
import WebWarningDescriptionBox from './web-warning-description-box';

export default {
  title: 'components/molecules/WebWarningDescriptionBox',
  component: WebWarningDescriptionBox,
} as Meta<typeof WebWarningDescriptionBox>;

export const Default: StoryObj<typeof WebWarningDescriptionBox> = {
  args: {
    description: 'description',
  },
};