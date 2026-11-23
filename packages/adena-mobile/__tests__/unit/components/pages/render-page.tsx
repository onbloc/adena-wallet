import { render } from '@testing-library/react-native';
import React, { ReactElement } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } };

export const renderPage = (page: ReactElement): ReturnType<typeof render> => render(<SafeAreaProvider initialMetrics={metrics}>{page}</SafeAreaProvider>);

export const wrapPage = (page: ReactElement): ReactElement => <SafeAreaProvider initialMetrics={metrics}>{page}</SafeAreaProvider>;
