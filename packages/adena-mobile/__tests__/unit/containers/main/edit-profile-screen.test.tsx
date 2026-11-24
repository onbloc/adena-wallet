import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { EditProfileScreen } from '../../../../src/containers/main/edit-profile-screen';
import { Account } from '../../../../src/domain/account';
import { useToastStore } from '../../../../src/stores/toast.store';
import { ACCOUNT, createWrapper, NETWORK } from '../../../helpers/query-wrapper';

const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } };
const ADDRESS = 'g1jg8mtutu9khhfwc4nxmuhcpftf0pajdhfvsqf5';

const setup = async (account: Account = { ...ACCOUNT, name: 'Main' }) => {
  const updateProfile = jest.fn();
  const { Wrapper } = createWrapper({
    accountService: { getCurrentAccount: () => account, getAccounts: () => [account], getAddress: () => ADDRESS, updateProfile },
    networkService: { getCurrentNetwork: () => NETWORK, getNetworks: () => [NETWORK] },
  });
  const navigation = { goBack: jest.fn() };
  const Screen = EditProfileScreen as unknown as React.ComponentType<{ navigation: unknown; route: unknown }>;

  await render(
    <SafeAreaProvider initialMetrics={metrics}>
      <Wrapper><Screen navigation={navigation} route={{ key: 'EditProfile', name: 'EditProfile', params: { accountId: account.id } }} /></Wrapper>
    </SafeAreaProvider>,
  );

  return { navigation, updateProfile };
};

const save = (): ReturnType<typeof screen.getByTestId> => screen.getByTestId('edit-profile-save');

describe('EditProfileScreen', () => {
  beforeEach(() => useToastStore.setState({ toast: null }));

  it('enables Save only after a change and saves the name and color locally', async () => {
    const { navigation, updateProfile } = await setup();

    expect(screen.getByText('g1jg...sqf5')).toBeTruthy();
    expect(save().props.accessibilityState).toMatchObject({ disabled: true });

    await fireEvent.press(screen.getByRole('button', { name: 'Change avatar color' }));
    expect(screen.getByRole('radio', { name: 'Ink' }).props.accessibilityState).toMatchObject({ selected: true });
    await fireEvent.press(screen.getByRole('radio', { name: 'Teal' }));
    await fireEvent.changeText(screen.getByLabelText('Account name'), '  Savings ');
    await fireEvent.press(save());

    expect(updateProfile).toHaveBeenCalledWith(ACCOUNT.id, { name: 'Savings', avatarColor: 'teal' });
    expect(useToastStore.getState().toast).toMatchObject({ message: 'Profile updated', tone: 'success' });
    expect(navigation.goBack).toHaveBeenCalledTimes(1);
  });

  it('requires a name and keeps the saved color', async () => {
    const { updateProfile } = await setup({ ...ACCOUNT, name: 'Main', avatarColor: 'green' });

    await fireEvent.changeText(screen.getByLabelText('Account name'), '   ');
    expect(screen.getByText('Account name is required')).toBeTruthy();
    expect(save().props.accessibilityState).toMatchObject({ disabled: true });

    await fireEvent.changeText(screen.getByLabelText('Account name'), 'Main 2');
    await fireEvent.press(save());
    expect(updateProfile).toHaveBeenCalledWith(ACCOUNT.id, { name: 'Main 2', avatarColor: 'green' });
  });

  it('shows a save error as a toast', async () => {
    const { updateProfile, navigation } = await setup();

    updateProfile.mockImplementation(() => {
      throw new Error('Disk full');
    });
    await fireEvent.changeText(screen.getByLabelText('Account name'), 'Other');
    await fireEvent.press(save());

    expect(useToastStore.getState().toast).toMatchObject({ message: 'Disk full', tone: 'error' });
    expect(navigation.goBack).not.toHaveBeenCalled();
  });
});
