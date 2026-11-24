import { renderHook, waitFor } from '@testing-library/react-native';

import { AppError, AppErrorCode } from '../../../src/core/errors';
import { useCloudBackupAvailableQuery, useCloudBackupStatusQuery, useRestorableBackupsQuery } from '../../../src/queries/cloud-backup.queries';
import { createWrapper } from '../../helpers/query-wrapper';

describe('cloud backup queries', () => {
  it('reads availability and status', async () => {
    const cloudBackupService = {
      isAvailable: jest.fn().mockResolvedValue(true),
      getStatus: jest.fn().mockResolvedValue({ kind: 'none' }),
    };
    const { Wrapper } = createWrapper({ cloudBackupService });
    const available = await renderHook(() => useCloudBackupAvailableQuery(), { wrapper: Wrapper });
    const status = await renderHook(() => useCloudBackupStatusQuery(), { wrapper: Wrapper });

    await waitFor(() => expect(available.result.current.data).toBe(true));
    await waitFor(() => expect(status.result.current.data).toEqual({ kind: 'none' }));
  });

  it('lists backups only when enabled and passes the interactive flag', async () => {
    const cloudBackupService = { findBackups: jest.fn().mockResolvedValue([{ fileName: 'f', modifiedAt: 1 }]) };
    const { Wrapper } = createWrapper({ cloudBackupService });
    const disabled = await renderHook(() => useRestorableBackupsQuery({ interactive: false, enabled: false }), { wrapper: Wrapper });

    expect(disabled.result.current.fetchStatus).toBe('idle');
    const { result } = await renderHook(() => useRestorableBackupsQuery({ interactive: true }), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.data).toHaveLength(1));
    expect(cloudBackupService.findBackups).toHaveBeenCalledWith({ interactive: true });
  });

  it('does not retry a failed status check', async () => {
    const cloudBackupService = { getStatus: jest.fn().mockRejectedValue(new AppError(AppErrorCode.NETWORK_ERROR)) };
    const { Wrapper } = createWrapper({ cloudBackupService });
    const { result } = await renderHook(() => useCloudBackupStatusQuery(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(cloudBackupService.getStatus).toHaveBeenCalledTimes(1);
  });
});
