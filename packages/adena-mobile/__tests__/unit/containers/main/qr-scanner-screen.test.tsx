import { act, fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';
import { Linking } from 'react-native';
import { launchImageLibrary } from 'react-native-image-picker';
import { loadImage } from 'react-native-nitro-image';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useCameraDevice, useCameraPermission } from 'react-native-vision-camera';
import { createBarcodeScanner, useBarcodeScannerOutput } from 'react-native-vision-camera-barcode-scanner';

import { QrScannerScreen } from '../../../../src/containers/main/qr-scanner-screen';
import { useToastStore } from '../../../../src/stores/toast.store';
import { normalizeAddress } from '../../../../src/utils/address';
import { ACCOUNT, createWrapper, NETWORK } from '../../../helpers/query-wrapper';

jest.mock('@react-navigation/native', () => ({ ...jest.requireActual('@react-navigation/native'), useIsFocused: () => true }));

const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } };
const ADDRESS = 'g1jg8mtutu9khhfwc4nxmuhcpftf0pajdhfvsqf5';

type ScannerOptions = { onBarcodeScanned: (barcodes: { rawValue?: string; displayValue?: string }[]) => void };

const permissionMock = useCameraPermission as unknown as jest.Mock;
const deviceMock = useCameraDevice as unknown as jest.Mock;
const outputMock = useBarcodeScannerOutput as unknown as jest.Mock;

const permission = (status: string, requestPermission = jest.fn(async () => status === 'authorized')) => ({
  status,
  hasPermission: status === 'authorized',
  canRequestPermission: status === 'not-determined',
  requestPermission,
});

const scan = (...values: string[]): Promise<void> => act(async () => {
  const options = outputMock.mock.calls.at(-1)?.[0] as ScannerOptions;

  options.onBarcodeScanned(values.map(rawValue => ({ rawValue })));
});

const setup = async (params: { returnKey?: string } | undefined = { returnKey: 'SendRecipient-1' }) => {
  const { Wrapper } = createWrapper({
    accountService: { getCurrentAccount: () => ACCOUNT, getAccounts: () => [ACCOUNT], getAddress: () => 'g1self' },
    networkService: { getCurrentNetwork: () => NETWORK, getNetworks: () => [NETWORK] },
    chainRegistry: { forNetwork: () => ({ normalizeAddress: (value: string) => normalizeAddress(value, 'g') }) },
  });
  const navigation = { goBack: jest.fn(), dispatch: jest.fn(), replace: jest.fn() };
  const route = { key: 'QrScanner-1', name: 'QrScanner', params };
  const Screen = QrScannerScreen as unknown as React.ComponentType<{ navigation: unknown; route: unknown }>;

  await render(
    <SafeAreaProvider initialMetrics={metrics}>
      <Wrapper><Screen navigation={navigation} route={route} /></Wrapper>
    </SafeAreaProvider>,
  );

  return { navigation };
};

describe('QrScannerScreen', () => {
  beforeEach(() => {
    permissionMock.mockReturnValue(permission('authorized'));
    deviceMock.mockReturnValue({ id: 'back' });
    outputMock.mockClear();
  });

  it('returns the first valid address to the opening route once', async () => {
    const { navigation } = await setup();

    expect(screen.getByTestId('camera')).toBeTruthy();
    await scan(`gno:${ADDRESS}?amount=1`);
    await scan(ADDRESS);

    expect(navigation.dispatch).toHaveBeenCalledTimes(1);
    expect(navigation.dispatch).toHaveBeenCalledWith(expect.objectContaining({
      type: 'SET_PARAMS',
      payload: { params: { scannedAddress: ADDRESS } },
      source: 'SendRecipient-1',
    }));
    expect(navigation.goBack).toHaveBeenCalledTimes(1);
  });

  it('returns the canonical lowercase address for an uppercase QR and notes ignored parameters', async () => {
    useToastStore.setState({ toast: null });
    const { navigation } = await setup();

    await scan(`GNO:${ADDRESS.toUpperCase()}?AMOUNT=1`);

    expect(navigation.dispatch).toHaveBeenCalledWith(expect.objectContaining({ payload: { params: { scannedAddress: ADDRESS } } }));
    expect(useToastStore.getState().toast).toMatchObject({ message: 'Only the address from this QR code was used.' });
  });

  it('rejects a payment URI for another chain family', async () => {
    const { navigation } = await setup();

    await scan(`cosmos:${ADDRESS}`);

    expect(screen.getByText('Not a valid Gno.land address')).toBeTruthy();
    expect(navigation.dispatch).not.toHaveBeenCalled();
  });

  it('continues to the send flow when opened without a return route', async () => {
    const { navigation } = await setup({});

    await scan(ADDRESS);

    expect(navigation.dispatch).not.toHaveBeenCalled();
    expect(navigation.replace).toHaveBeenCalledWith('SendRecipient', { scannedAddress: ADDRESS });
  });

  it('shows the receive sheet and closes from the back action', async () => {
    const { navigation } = await setup();

    expect(screen.getByText('Gno.land wallet address')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Show my QR code' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Back' }));

    expect(navigation.replace).toHaveBeenCalledWith('Receive');
    expect(navigation.goBack).toHaveBeenCalledTimes(1);
  });

  it('shows an error for an invalid code and keeps scanning', async () => {
    const { navigation } = await setup();

    await scan('https://example.com');
    expect(screen.getByText('Not a valid Gno.land address')).toBeTruthy();
    expect(navigation.dispatch).not.toHaveBeenCalled();

    await scan(ADDRESS);
    expect(navigation.goBack).toHaveBeenCalledTimes(1);
  });

  it('requests permission on open', async () => {
    const requestPermission = jest.fn(async () => false);

    permissionMock.mockReturnValue(permission('not-determined', requestPermission));
    await setup();

    expect(requestPermission).toHaveBeenCalledTimes(1);
    expect(await screen.findByText('Camera access needed')).toBeTruthy();
  });

  it('offers the settings when the permission is denied', async () => {
    const openSettings = jest.spyOn(Linking, 'openSettings').mockResolvedValue(undefined);

    permissionMock.mockReturnValue(permission('denied'));
    await setup();

    expect(screen.queryByTestId('camera')).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: 'Open settings' }));
    expect(openSettings).toHaveBeenCalledTimes(1);
  });

  it('reads an address from a picked photo', async () => {
    const dispose = jest.fn();

    (launchImageLibrary as jest.Mock).mockResolvedValue({ assets: [{ uri: 'file:///tmp/qr.png' }] });
    (loadImage as jest.Mock).mockResolvedValue({ dispose });
    (createBarcodeScanner as jest.Mock).mockReturnValue({ scanCodesInImageAsync: jest.fn(async () => [{ rawValue: ADDRESS }]), dispose: jest.fn() });
    const { navigation } = await setup();

    await fireEvent.press(screen.getByRole('button', { name: 'From photos' }));

    expect(loadImage).toHaveBeenCalledWith({ filePath: 'file:///tmp/qr.png' });
    expect(dispose).toHaveBeenCalledTimes(1);
    expect(navigation.dispatch).toHaveBeenCalledWith(expect.objectContaining({ payload: { params: { scannedAddress: ADDRESS } } }));
  });

  it('explains a photo without a QR code', async () => {
    (launchImageLibrary as jest.Mock).mockResolvedValue({ assets: [{ uri: 'file:///tmp/none.png' }] });
    (loadImage as jest.Mock).mockResolvedValue({ dispose: jest.fn() });
    (createBarcodeScanner as jest.Mock).mockReturnValue({ scanCodesInImageAsync: jest.fn(async () => []), dispose: jest.fn() });
    const { navigation } = await setup();

    await fireEvent.press(screen.getByRole('button', { name: 'From photos' }));

    expect(screen.getByText('No QR code found in this photo')).toBeTruthy();
    expect(navigation.dispatch).not.toHaveBeenCalled();
  });

  it('explains a missing camera', async () => {
    deviceMock.mockReturnValue(undefined);
    await setup();

    expect(screen.getByText('No camera available')).toBeTruthy();
  });
});
