import Clipboard from '@react-native-clipboard/clipboard';
import { fireEvent, screen } from '@testing-library/react-native';
import { Share } from 'react-native';

import { ReceiveScreen } from '../../../src/containers/main/receive-screen';
import { renderScreen, resetStores, setupWallet, toastMessage } from '../../helpers/render-screen';

describe('ReceiveScreen', () => {
  beforeEach(resetStores);

  it('copies and shares the current address', async () => {
    const share = jest.spyOn(Share, 'share').mockResolvedValue({ action: 'sharedAction', activityType: undefined });
    const { env, account, address } = await setupWallet();
    const { navigation } = await renderScreen(ReceiveScreen, { env });

    expect(screen.getByText(account.name)).toBeTruthy();
    expect(screen.getByText(address)).toBeTruthy();

    await fireEvent.press(screen.getByRole('button', { name: 'Copy address' }));
    expect(Clipboard.setString).toHaveBeenCalledWith(address);
    expect(toastMessage()).toBe('Address copied');

    await fireEvent.press(screen.getByRole('button', { name: 'Share' }));
    expect(share).toHaveBeenCalledWith({ message: address });

    await fireEvent.press(screen.getAllByRole('button', { name: 'Close' }).at(-1)!);
    expect(navigation.goBack).toHaveBeenCalled();
  });
});
