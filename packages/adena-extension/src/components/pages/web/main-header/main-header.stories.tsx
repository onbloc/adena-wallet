import { Meta, StoryObj } from '@storybook/react';
import { action } from '@storybook/addon-actions';

import { WebMainHeader } from '.';

export default {
  title: 'components/pages/WebMainHeader',
  component: WebMainHeader,
} as Meta<typeof WebMainHeader>;

export const Default: StoryObj<typeof WebMainHeader> = {
  args: {
    currentStep: 1,
    stepLength: 4,
    onClickGoBack: action('click back'),
  },
};