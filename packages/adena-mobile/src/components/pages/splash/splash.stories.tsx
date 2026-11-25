import type { Meta, StoryObj } from '@storybook/react-native-web-vite';

import { SplashPage } from './splash';

const meta = {
  title: 'Pages/Splash',
  component: SplashPage,
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof SplashPage>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
