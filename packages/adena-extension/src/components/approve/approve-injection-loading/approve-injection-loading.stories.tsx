import ApproveInjectionLoading, { type ApproveInjectionLoadingProps } from './approve-injection-loading';
import { Meta, StoryObj } from '@storybook/react';
import { action } from '@storybook/addon-actions';

export default {
  title: 'components/approve/ApproveInjectionLoading',
  component: ApproveInjectionLoading,
} as Meta<typeof ApproveInjectionLoading>;

export const Default: StoryObj<ApproveInjectionLoadingProps> = {
  args: {
    wait: 1000,
    timeout: 1000,
    done: false,
    onTimeout: action('onTimeout'),
  },
};