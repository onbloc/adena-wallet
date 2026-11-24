import { AppError, AppErrorCode } from '../core/errors';

// A step upgrades the subject from `version - 1` to `version`.
export interface MigrationStep<TContext> {
  version: number;
  description: string;
  up(context: TContext): Promise<void> | void;
}

export interface MigrationOutcome {
  fromVersion: number;
  toVersion: number;
  applied: number[];
}

export const latestVersion = <T>(steps: MigrationStep<T>[]): number =>
  steps.reduce((max, step) => Math.max(max, step.version), 0);

export const runMigrations = async <TContext>(
  context: TContext,
  currentVersion: number,
  steps: MigrationStep<TContext>[],
  onStepApplied?: (version: number) => Promise<void> | void,
): Promise<MigrationOutcome> => {
  const target = latestVersion(steps);

  if (currentVersion > target) {
    throw new AppError(AppErrorCode.MIGRATION_FAILED, `Stored version ${currentVersion} is newer than supported ${target}`);
  }

  const ordered = [...steps].sort((a, b) => a.version - b.version);
  const applied: number[] = [];
  let version = currentVersion;

  for (const step of ordered) {
    if (step.version <= version) {
      continue;
    }

    if (step.version !== version + 1) {
      throw new AppError(AppErrorCode.MIGRATION_FAILED, `Missing migration step ${version + 1}`);
    }

    try {
      await step.up(context);
    }
    catch (error) {
      throw new AppError(AppErrorCode.MIGRATION_FAILED, `Migration to v${step.version} failed`, { cause: error });
    }

    version = step.version;
    applied.push(version);
    await onStepApplied?.(version);
  }

  return { fromVersion: currentVersion, toVersion: version, applied };
};

// Pure data migration used for versioned records such as the decrypted vault.
export interface DataMigration {
  version: number;
  up(data: unknown): unknown;
}

export const migrateData = <T>(
  data: unknown,
  currentVersion: number,
  steps: DataMigration[],
): { data: T; version: number; changed: boolean } => {
  const ordered = [...steps].sort((a, b) => a.version - b.version);
  const target = ordered.length ? ordered[ordered.length - 1].version : currentVersion;

  if (currentVersion > target) {
    throw new AppError(AppErrorCode.MIGRATION_FAILED, `Record version ${currentVersion} is newer than supported ${target}`);
  }

  let version = currentVersion;
  let value = data;

  for (const step of ordered) {
    if (step.version <= version) {
      continue;
    }

    if (step.version !== version + 1) {
      throw new AppError(AppErrorCode.MIGRATION_FAILED, `Missing data migration step ${version + 1}`);
    }

    value = step.up(value);
    version = step.version;
  }

  return { data: value as T, version, changed: version !== currentVersion };
};
