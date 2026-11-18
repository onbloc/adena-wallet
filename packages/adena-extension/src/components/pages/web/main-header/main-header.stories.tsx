import { Meta, StoryObj } from '@storybook/react-vite';
import { action } from 'storybook/actions';

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