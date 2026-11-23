import Clipboard from '@react-native-clipboard/clipboard';
import { act, renderHook } from '@testing-library/react-native';

import { useCopyToClipboard } from '../../../src/hooks/use-copy-to-clipboard';
import { useToastStore } from '../../../src/stores/toast.store';

describe('useCopyToClipboard', () => {
  beforeEach(() => {
    (Clipboard.setString as jest.Mock).mockClear();
    useToastStore.setState({ toast: null });
  });

  it('copies with the default message', async () => {
    const { result } = await renderHook(() => useCopyToClipboard());

    await act(async () => result.current('g1abc'));
    expect(Clipboard.setString).toHaveBeenCalledWith('g1abc');
    expect(useToastStore.getState().toast).toMatchObject({ message: 'Address copied', tone: 'success' });
  });

  it('copies empty values with a custom message', async () => {
    const { result } = await renderHook(() => useCopyToClipboard());

    await act(async () => result.current('', 'Hash copied'));
    expect(Clipboard.setString).toHaveBeenCalledWith('');
    expect(useToastStore.getState().toast?.message).toBe('Hash copied');
  });
});
