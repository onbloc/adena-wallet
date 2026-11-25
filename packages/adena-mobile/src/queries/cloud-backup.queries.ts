import { useQuery, UseQueryResult } from '@tanstack/react-query';

import { useContainer } from '../di/container-provider';
import { CloudBackupStatus, RestorableBackup } from '../services/cloud-backup.service';
import { queryKeys } from './query-keys';

export const useCloudBackupAvailableQuery = (): UseQueryResult<boolean> => {
  const { cloudBackupService } = useContainer();

  return useQuery({
    queryKey: queryKeys.cloudBackupAvailable(),
    queryFn: () => cloudBackupService.isAvailable(),
    staleTime: 60_000,
  });
};

// Always refetched on mount: account changes elsewhere decide whether the backup is outdated.
export const useCloudBackupStatusQuery = (): UseQueryResult<CloudBackupStatus> => {
  const { cloudBackupService } = useContainer();

  return useQuery({
    queryKey: queryKeys.cloudBackupStatus(),
    queryFn: () => cloudBackupService.getStatus(),
    staleTime: 0,
    retry: false,
  });
};

// Without `interactive` nothing is shown to the user, so Google Drive may fail until access is granted.
export const useRestorableBackupsQuery = (options: { interactive: boolean; enabled?: boolean }): UseQueryResult<RestorableBackup[]> => {
  const { cloudBackupService } = useContainer();

  return useQuery({
    queryKey: queryKeys.restorableBackups(options.interactive),
    queryFn: () => cloudBackupService.findBackups({ interactive: options.interactive }),
    enabled: options.enabled ?? true,
    staleTime: 0,
    retry: false,
  });
};
