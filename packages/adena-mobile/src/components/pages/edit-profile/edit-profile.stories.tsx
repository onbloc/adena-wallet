import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { fn } from 'storybook/test';

import { AVATAR_COLORS } from '../../../domain/account';
import { SAMPLE_ADDRESS } from '../../../stories/fixtures';
import { avatarColors } from '../../../theme';
import { EditProfilePage } from './edit-profile';

const meta = {
  title: 'Pages/EditProfile',
  component: EditProfilePage,
  parameters: { layout: 'fullscreen' },
  args: {
    name: 'Gnome Wallet',
    address: SAMPLE_ADDRESS,
    avatarColor: avatarColors.teal,
    colorOptions: AVATAR_COLORS.map(key => ({ key, label: key, color: avatarColors[key] })),
    selectedColorKey: 'teal',
    colorSheetVisible: false,
    onOpenColorSheet: fn(),
    onCloseColorSheet: fn(),
    onSelectColor: fn(),
    onChangeName: fn(),
    canSave: true,
    onSave: fn(),
    onBack: fn(),
  },
} satisfies Meta<typeof EditProfilePage>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Edited: Story = {};

export const Unchanged: Story = { args: { avatarColor: undefined, selectedColorKey: 'ink', canSave: false } };

export const InvalidName: Story = { args: { name: '', nameError: 'Account name is required', canSave: false } };

export const ColorPicker: Story = { args: { colorSheetVisible: true } };
