import { Meta, StoryObj } from '@storybook/react';
import { action } from '@storybook/addon-actions';

import { WebSecurityHeader } from '.';

export default {
  title: 'components/pages/WebSecurityHeader',
  component: WebSecurityHeader,
} as Meta<typeof WebSecurityHeader>;


export const Default: StoryObj<typeof WebSecurityHeader> = {
  args: {
    currentStep: 0,
    stepLength: 2,
    visibleBackButton: true,
    onClickGoBack: action('click back'),
  },
};