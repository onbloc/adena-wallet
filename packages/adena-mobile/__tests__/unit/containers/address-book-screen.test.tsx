import { fireEvent, screen } from '@testing-library/react-native';

import { AddressBookScreen } from '../../../src/containers/main/address-book-screen';
import { renderScreen, resetStores, setupWallet } from '../../helpers/render-screen';

const FRIEND = 'g1jg8mtutu9khhfwc4nxmuhcpftf0pajdhfvsqf5';

describe('AddressBookScreen', () => {
  beforeEach(resetStores);

  it('shows the empty state and opens the add form', async () => {
    const { env } = await setupWallet();
    const { navigation } = await renderScreen(AddressBookScreen, { env });

    expect(screen.getByText('No saved addresses')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Add address' }));
    expect(navigation.navigate).toHaveBeenCalledWith('AddressBookEdit');
    await fireEvent.press(screen.getByRole('button', { name: 'Back' }));
    expect(navigation.goBack).toHaveBeenCalled();
  });

  it('opens an entry for editing', async () => {
    const { env, network } = await setupWallet();
    const entry = env.container.addressBookService.add({ name: 'Friend', address: FRIEND }, network);
    const { navigation } = await renderScreen(AddressBookScreen, { env });

    expect(screen.queryByText('No saved addresses')).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: /^Friend,/ }));
    expect(navigation.navigate).toHaveBeenCalledWith('AddressBookEdit', { entry });
  });
});
