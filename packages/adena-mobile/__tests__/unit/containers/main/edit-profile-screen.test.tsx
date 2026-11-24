import { act, fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { SHEET_EXIT_MS } from '../../../../src/components/molecules';
import { EditProfileScreen } from '../../../../src/containers/main/edit-profile-screen';
import { Account } from '../../../../src/domain/account';
import { pickProfilePhoto } from '../../../../src/infrastructure/media/profile-photo-picker';
import { useToastStore } from '../../../../src/stores/toast.store';
import { ACCOUNT, createWrapper, NETWORK } from '../../../helpers/query-wrapper';

jest.mock('../../../../src/infrastructure/media/profile-photo-picker', () => ({ pickProfilePhoto: jest.fn() }));

const pickMock = pickProfilePhoto as jest.MockedFunction<typeof pickProfilePhoto>;
const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } };
const ADDRESS = 'g1jg8mtutu9khhfwc4nxmuhcpftf0pajdhfvsqf5';
const SAVED = 'data:image/jpeg;base64,U0FWRUQ=';
const PICKED = 'data:image/jpeg;base64,UElDS0VE';

const setup = async ({ account = { ...ACCOUNT, name: 'Main' }, photo }: { account?: Account; photo?: string } = {}) => {
  const updateProfile = jest.fn();
  const accountPhotoService = { get: jest.fn(() => photo), save: jest.fn(), remove: jest.fn() };
  const { Wrapper } = createWrapper({
    accountService: { getCurrentAccount: () => account, getAccounts: () => [account], getAddress: () => ADDRESS, updateProfile },
    accountPhotoService,
    networkService: { getCurrentNetwork: () => NETWORK, getNetworks: () => [NETWORK] },
  });
  const navigation = { goBack: jest.fn() };
  const Screen = EditProfileScreen as unknown as React.ComponentType<{ navigation: unknown; route: unknown }>;

  await render(
    <SafeAreaProvider initialMetrics={metrics}>
      <Wrapper><Screen navigation={navigation} route={{ key: 'EditProfile', name: 'EditProfile', params: { accountId: account.id } }} /></Wrapper>
    </SafeAreaProvider>,
  );

  return { navigation, updateProfile, accountPhotoService };
};

const save = (): ReturnType<typeof screen.getByTestId> => screen.getByTestId('edit-profile-save');

const changePhoto = (): Promise<void> => fireEvent.press(screen.getByRole('button', { name: 'Change profile photo' }));

describe('EditProfileScreen', () => {
  beforeEach(() => {
    useToastStore.setState({ toast: null });
    pickMock.mockReset();
  });

  it('enables Save only after a change and saves the name without touching the photo', async () => {
    const { navigation, updateProfile, accountPhotoService } = await setup();

    expect(screen.getByText('g1jg...sqf5')).toBeTruthy();
    expect(save().props.accessibilityState).toMatchObject({ disabled: true });

    await fireEvent.changeText(screen.getByLabelText('Account name'), '  Savings ');
    await fireEvent.press(save());

    expect(updateProfile).toHaveBeenCalledWith(ACCOUNT.id, { name: 'Savings' });
    expect(accountPhotoService.save).not.toHaveBeenCalled();
    expect(accountPhotoService.remove).not.toHaveBeenCalled();
    expect(useToastStore.getState().toast).toMatchObject({ message: 'Profile updated', tone: 'success' });
    expect(navigation.goBack).toHaveBeenCalledTimes(1);
  });

  it('opens the picker directly without a photo and saves the picked one', async () => {
    pickMock.mockResolvedValue(PICKED);
    const { accountPhotoService } = await setup();

    await changePhoto();
    expect(pickMock).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('avatar-photo').props.source).toEqual({ uri: PICKED });

    await fireEvent.press(save());
    expect(accountPhotoService.save).toHaveBeenCalledWith(ACCOUNT.id, PICKED);
  });

  it('keeps the current avatar when picking is canceled', async () => {
    pickMock.mockResolvedValue(null);
    await setup();

    await changePhoto();
    expect(screen.queryByTestId('avatar-photo')).toBeNull();
    expect(save().props.accessibilityState).toMatchObject({ disabled: true });
  });

  it('removes a saved photo from the options sheet', async () => {
    const { accountPhotoService } = await setup({ photo: SAVED });

    expect(screen.getByTestId('avatar-photo').props.source).toEqual({ uri: SAVED });
    await changePhoto();
    expect(pickMock).not.toHaveBeenCalled();
    await fireEvent.press(screen.getByRole('button', { name: 'Remove photo' }));
    expect(screen.queryByTestId('avatar-photo')).toBeNull();

    await fireEvent.press(save());
    expect(accountPhotoService.remove).toHaveBeenCalledWith(ACCOUNT.id);
  });

  it('opens the picker only after the options sheet is dismissed', async () => {
    pickMock.mockResolvedValue(PICKED);
    jest.useFakeTimers();
    await setup({ photo: SAVED });

    await changePhoto();
    await fireEvent.press(screen.getByRole('button', { name: 'Choose photo' }));
    expect(pickMock).not.toHaveBeenCalled();

    // The sheet reports it is gone once its exit has run.
    await act(async () => jest.advanceTimersByTime(SHEET_EXIT_MS - 1));
    expect(pickMock).not.toHaveBeenCalled();
    await act(async () => jest.advanceTimersByTime(1));
    expect(pickMock).toHaveBeenCalledTimes(1);
    jest.useRealTimers();
    expect(screen.getByTestId('avatar-photo').props.source).toEqual({ uri: PICKED });
  });

  it('shows picker and save errors as toasts', async () => {
    pickMock.mockRejectedValue(new Error('Could not load this photo'));
    const { accountPhotoService, navigation } = await setup();

    await changePhoto();
    expect(useToastStore.getState().toast).toMatchObject({ message: 'Could not load this photo', tone: 'error' });

    pickMock.mockResolvedValue(PICKED);
    accountPhotoService.save.mockImplementation(() => {
      throw new Error('This photo is too large. Choose a smaller one.');
    });
    await changePhoto();
    await fireEvent.press(save());

    expect(useToastStore.getState().toast).toMatchObject({ message: 'This photo is too large. Choose a smaller one.', tone: 'error' });
    expect(navigation.goBack).not.toHaveBeenCalled();
  });
});
