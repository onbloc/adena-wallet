// Captures the latest scanner options so tests can emit barcodes.
export const useBarcodeScannerOutput = jest.fn((options: unknown) => ({ options }));
export const createBarcodeScanner = jest.fn(() => ({ scanCodesInImageAsync: jest.fn(async () => []), dispose: jest.fn() }));
