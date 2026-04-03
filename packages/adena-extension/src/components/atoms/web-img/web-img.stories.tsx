import { Meta, StoryObj } from '@storybook/react-vite';
import { WebImg } from '.';

export default {
  title: 'components/atoms/WebImg',
  component: WebImg,
} as Meta<typeof WebImg>;

export const Default: StoryObj<typeof WebImg> = {
  args: {
    src: 'https://adena.app/assets/images/favicon.svg',
    size: 20,
  },
};