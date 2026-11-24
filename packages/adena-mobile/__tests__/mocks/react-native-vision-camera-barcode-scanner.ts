// Captures the latest scanner options so tests can emit barcodes.
export const useBarcodeScannerOutput = jest.fn((options: unknown) => ({ options }));
