import IconAdd from '@assets/icon-add';
import { Meta, StoryObj } from '@storybook/react';
import WebMainButton from '.';

export default {
  title: 'components/atoms/WebMainButton',
  component: WebMainButton,
} as Meta<typeof WebMainButton>;

export const Default: StoryObj<typeof WebMainButton> = {
  args: {
    figure: 'primary',
    width: '200px',
    text: 'Connect Hardware Wallet',
    iconElement: IconAdd(),
    disabled: true,
  },
};