import { fireEvent, screen } from '@testing-library/react-native';

import { AddressBookEditScreen } from '../../../src/containers/main/address-book-edit-screen';
import { useSessionStore } from '../../../src/stores/session.store';
import { renderScreen, resetStores, setupWallet } from '../../helpers/render-screen';

const FRIEND = 'g1jg8mtutu9khhfwc4nxmuhcpftf0pajdhfvsqf5';

describe('AddressBookEditScreen', () => {
  beforeEach(resetStores);

  it('adds an entry after correcting the address', async () => {
    const { env } = await setupWallet();
    const { navigation } = await renderScreen(AddressBookEditScreen, { env });

    expect(screen.getByText('Add address')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Remove address' })).toBeNull();
    await fireEvent.changeText(screen.getByLabelText('Name'), 'Friend');
    await fireEvent.changeText(screen.getByLabelText('Address'), 'g1invalid');
    await fireEvent.press(screen.getByRole('button', { name: 'Save' }));

    expect(screen.getByText('Enter a valid Gno.land address')).toBeTruthy();
    expect(navigation.goBack).not.toHaveBeenCalled();

    await fireEvent.changeText(screen.getByLabelText('Address'), FRIEND);
    expect(screen.queryByText('Enter a valid Gno.land address')).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: 'Save' }));

    expect(env.container.addressBookService.getEntries()).toMatchObject([{ name: 'Friend', address: FRIEND }]);
    expect(useSessionStore.getState().revision).toBe(1);
    expect(navigation.goBack).toHaveBeenCalledTimes(1);
  });

  it('reports name problems on the name field', async () => {
    const { env, network } = await setupWallet();

    env.container.addressBookService.add({ name: 'Friend', address: FRIEND }, network);
    await renderScreen(AddressBookEditScreen, { env });
    await fireEvent.changeText(screen.getByLabelText('Name'), 'friend');
    await fireEvent.changeText(screen.getByLabelText('Address'), env.container.accountService.getAddress(env.container.accountService.getAccounts()[0], network));
    await fireEvent.press(screen.getByRole('button', { name: 'Save' }));

    expect(screen.getByText('This name is already used')).toBeTruthy();
    await fireEvent.changeText(screen.getByLabelText('Name'), 'Me');
    expect(screen.queryByText('This name is already used')).toBeNull();
  });

  it('edits and removes an existing entry', async () => {
    const { env, network } = await setupWallet();
    const entry = env.container.addressBookService.add({ name: 'Friend', address: FRIEND }, network);
    const { navigation } = await renderScreen(AddressBookEditScreen, { env, params: { entry } });

    expect(screen.getByText('Edit address')).toBeTruthy();
    await fireEvent.changeText(screen.getByLabelText('Name'), 'Best friend');
    await fireEvent.press(screen.getByRole('button', { name: 'Save' }));
    expect(env.container.addressBookService.getEntries()[0].name).toBe('Best friend');

    await fireEvent.press(screen.getByRole('button', { name: 'Remove address' }));
    expect(env.container.addressBookService.getEntries()).toEqual([]);
    expect(navigation.goBack).toHaveBeenCalledTimes(2);

    await fireEvent.press(screen.getByRole('button', { name: 'Back' }));
    expect(navigation.goBack).toHaveBeenCalledTimes(3);
  });
});
