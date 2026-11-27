import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import React from 'react';

import { RestoreBackupScreen } from '../../../../src/containers/onboarding/restore-backup-screen';
import { backupFileName } from '../../../../src/repositories/cloud-backup/cloud-backup-store';
import { useOnboardingStore } from '../../../../src/stores/onboarding.store';
import { createWrapper } from '../../../helpers/query-wrapper';
import { createTestContainer, TEST_MNEMONIC, TEST_PASSWORD } from '../../../helpers/test-container';
import { wrapPage } from '../../components/pages/render-page';

type RestoreBackupProps = Parameters<typeof RestoreBackupScreen>[0];

const FIRST_PASSWORD = 'violet orbit lantern 42';
const SECOND_PASSWORD = 'amber canyon whistle 58';

// A source device backs up, then backs up again with a different backup password.
const backedUpTwice = async () => {
  let clock = 1_700_000_000_000;
  const source = createTestContainer({ now: () => clock });

  await source.container.walletService.createWallet({ mnemonic: TEST_MNEMONIC, password: TEST_PASSWORD });

  for (const backupPassword of [FIRST_PASSWORD, SECOND_PASSWORD]) {
    clock += 60_000;
    await source.container.cloudBackupService.createBackup({ walletPassword: TEST_PASSWORD, backupPassword, confirmPassword: backupPassword });
  }

  return source.cloudBackupStore.files;
};

describe('RestoreBackupScreen', () => {
  let blur: (() => void) | undefined;
  const navigation = {
    navigate: jest.fn(),
    goBack: jest.fn(),
    addListener: jest.fn((_type: string, handler: () => void) => {
      blur = handler;
      return jest.fn();
    }),
  };
  const props = { navigation, route: { key: 'RestoreBackup', name: 'RestoreBackup' } } as unknown as RestoreBackupProps;

  const renderScreen = async (files: Awaited<ReturnType<typeof backedUpTwice>>) => {
    const { container } = createTestContainer({ cloudBackup: { files } });
    const { Wrapper } = createWrapper({ cloudBackupService: container.cloudBackupService });

    await render(wrapPage(<Wrapper><RestoreBackupScreen {...props} /></Wrapper>));
    return container.cloudBackupService;
  };

  const submit = async (password: string): Promise<void> => {
    await fireEvent.changeText(screen.getByTestId('restore-backup-password'), password);
    await fireEvent.press(screen.getByTestId('restore-backup-submit'));
  };

  beforeEach(() => {
    jest.clearAllMocks();
    useOnboardingStore.setState({ restoreBackup: null });
    blur = undefined;
  });

  it('opens an older version with the earlier backup password after the newest rejects it', async () => {
    await renderScreen(await backedUpTwice());
    const versionRow = await screen.findByTestId('restore-backup-version');

    expect(versionRow.props.accessibilityLabel).toMatch(/^Revision 2 · .+, Latest, Change$/);
    await submit(FIRST_PASSWORD);
    await screen.findByText('Incorrect backup password.');
    expect(screen.getByText('Try an older version')).toBeTruthy();
    expect(navigation.navigate).not.toHaveBeenCalled();

    await fireEvent.press(screen.getByTestId('restore-backup-choose-version'));
    expect(screen.getAllByRole('radio')).toHaveLength(2);
    await fireEvent.press(screen.getByRole('radio', { name: /^Revision 1 · / }));
    expect(screen.queryByText('Try an older version')).toBeNull();
    expect(screen.getByTestId('restore-backup-version').props.accessibilityLabel).toMatch(/^Revision 1 · /);

    await fireEvent.press(screen.getByTestId('restore-backup-submit'));
    await waitFor(() => expect(navigation.navigate).toHaveBeenCalledWith('ProtectWallet'));
    expect(useOnboardingStore.getState().restoreBackup?.revision).toBe(1);
  });

  it('opens the newest version by default', async () => {
    await renderScreen(await backedUpTwice());
    await screen.findByTestId('restore-backup-version');
    await submit(SECOND_PASSWORD);
    await waitFor(() => expect(navigation.navigate).toHaveBeenCalledWith('ProtectWallet'));
    expect(useOnboardingStore.getState().restoreBackup?.revision).toBe(2);
  });

  it('restores a single-file backup without a version picker', async () => {
    const files = await backedUpTwice();
    const [, file] = [...files].sort(([, a], [, b]) => a.modifiedAt - b.modifiedAt)[0];
    const legacy = new Map([[backupFileName(JSON.parse(file.contents).backupId), file]]);

    await renderScreen(legacy);
    await screen.findByTestId('restore-backup-password');
    expect(screen.queryByTestId('restore-backup-version')).toBeNull();
    await submit(FIRST_PASSWORD);
    await waitFor(() => expect(navigation.navigate).toHaveBeenCalledWith('ProtectWallet'));
  });

  it('drops an older version opened after the user left the screen', async () => {
    const service = await renderScreen(await backedUpTwice());
    const open = service.openBackup.bind(service);
    let release = (): void => undefined;
    const held = new Promise<void>((resolve) => {
      release = resolve;
    });
    const openBackup = jest.spyOn(service, 'openBackup').mockImplementation(async (...args) => {
      await held;
      return open(...args);
    });

    await screen.findByTestId('restore-backup-version');
    await fireEvent.press(screen.getByTestId('restore-backup-version'));
    await fireEvent.press(screen.getByRole('radio', { name: /^Revision 1 · / }));
    await submit(FIRST_PASSWORD);
    await act(() => blur?.());
    release();
    await waitFor(() => expect(openBackup).toHaveBeenCalledTimes(1));
    await openBackup.mock.results[0].value;
    expect(navigation.navigate).not.toHaveBeenCalled();
    expect(useOnboardingStore.getState().restoreBackup).toBeNull();
  });
});
