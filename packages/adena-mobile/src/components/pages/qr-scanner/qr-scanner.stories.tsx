import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import React from 'react';
import { View } from 'react-native';
import { fn } from 'storybook/test';

import { palette } from '../../../theme';
import { QrScannerPage } from './qr-scanner';

// Stand-in for the native camera preview.
const CAMERA = <View style={{ flex: 1, backgroundColor: palette.neutral600 }} />;

const meta = {
  title: 'Pages/QrScanner',
  component: QrScannerPage,
  parameters: { layout: 'fullscreen' },
  args: { status: 'scanning', camera: CAMERA, hint: 'Gno.land wallet address', onOpenSettings: fn(), onShowMyQr: fn(), onClose: fn() },
} satisfies Meta<typeof QrScannerPage>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Scanning: Story = {};

export const Requesting: Story = { args: { status: 'requesting' } };

export const InvalidCode: Story = { args: { error: 'Not a valid Gno.land address' } };

export const PermissionDenied: Story = { args: { status: 'denied' } };

export const NoDevice: Story = { args: { status: 'no-device' } };
