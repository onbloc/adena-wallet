import React, { ReactElement } from 'react';
import { View } from 'react-native';

// Native camera stand-in; tests drive permission and device state through these mocks.
export const useCameraPermission = jest.fn(() => ({
  status: 'authorized',
  hasPermission: true,
  canRequestPermission: false,
  requestPermission: jest.fn(async () => true),
}));

export const useCameraDevice = jest.fn((): unknown => ({ id: 'back', position: 'back' }));

export const Camera = (): ReactElement => <View testID='camera' />;
