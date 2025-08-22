import { Meta, StoryObj } from '@storybook/react';
import InfoTooltip, { type InfoTooltipProps } from './info-tooltip';

export default {
  title: 'components/common/InfoTooltip',
  component: InfoTooltip,
} as Meta<typeof InfoTooltip>;

export const Default: StoryObj<InfoTooltipProps> = {
  args: {
    content: 'This is a tooltip',
  },
};
