import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { fn } from 'storybook/test';

import { SAMPLE_ADDRESS, SAMPLE_AVATAR_PHOTO } from '../../../stories/fixtures';
import { EditProfilePage } from './edit-profile';

const meta = {
  title: 'Pages/EditProfile',
  component: EditProfilePage,
  parameters: { layout: 'fullscreen' },
  args: {
    name: 'Gnome Wallet',
    address: SAMPLE_ADDRESS,
    avatarColor: 'teal',
    onChangePhoto: fn(),
    photoSheetVisible: false,
    onChoosePhoto: fn(),
    onRemovePhoto: fn(),
    onClosePhotoSheet: fn(),
    onChangeName: fn(),
    canSave: false,
    onSave: fn(),
    onBack: fn(),
  },
} satisfies Meta<typeof EditProfilePage>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Initials: Story = {};

export const WithPhoto: Story = { args: { avatarPhoto: SAMPLE_AVATAR_PHOTO, canSave: true } };

export const InvalidName: Story = { args: { name: '', nameError: 'Account name is required' } };

export const PhotoOptions: Story = { args: { avatarPhoto: SAMPLE_AVATAR_PHOTO, photoSheetVisible: true } };
