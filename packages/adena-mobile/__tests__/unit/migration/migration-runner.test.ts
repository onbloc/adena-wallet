import { AppErrorCode, isAppError } from '../../../src/core/errors';
import { DataMigration, latestVersion, migrateData, MigrationStep, runMigrations } from '../../../src/migration/migration-runner';

const step = (version: number, up: MigrationStep<string[]>['up'] = log => void log.push(`v${version}`)): MigrationStep<string[]> =>
  ({ version, description: `v${version}`, up });

describe('latestVersion', () => {
  it('returns the highest version or 0', () => {
    expect(latestVersion([])).toBe(0);
    expect(latestVersion([step(2), step(5), step(1)])).toBe(5);
  });
});

describe('runMigrations', () => {
  it('does nothing when already current', async () => {
    const onStepApplied = jest.fn();

    expect(await runMigrations([], 2, [step(1), step(2)], onStepApplied)).toEqual({ fromVersion: 2, toVersion: 2, applied: [] });
    expect(onStepApplied).not.toHaveBeenCalled();
  });

  it('handles an empty step list from version 0', async () => {
    expect(await runMigrations([], 0, [])).toEqual({ fromVersion: 0, toVersion: 0, applied: [] });
  });

  it('applies steps from 0 in order and awaits async steps', async () => {
    const log: string[] = [];
    const asyncStep = step(2, async (items) => {
      await Promise.resolve();
      items.push('async');
    });

    expect(await runMigrations(log, 0, [asyncStep, step(1)])).toEqual({ fromVersion: 0, toVersion: 2, applied: [1, 2] });
    expect(log).toEqual(['v1', 'async']);
  });

  it('awaits the progress callback before the next step', async () => {
    const events: string[] = [];

    await runMigrations(events, 0, [step(1), step(2)], async (version) => {
      await Promise.resolve();
      events.push(`saved ${version}`);
    });
    expect(events).toEqual(['v1', 'saved 1', 'v2', 'saved 2']);
  });

  it('rejects stored versions newer than supported', async () => {
    await expect(runMigrations([], 3, [step(1)])).rejects.toThrow('Stored version 3 is newer than supported 1');
  });

  it('rejects gaps', async () => {
    await expect(runMigrations([], 0, [step(2)])).rejects.toThrow('Missing migration step 1');
  });

  it('wraps step failures and stops', async () => {
    const cause = new Error('boom');
    const onStepApplied = jest.fn();
    const error = await runMigrations([], 0, [step(1), step(2, () => {
      throw cause;
    }), step(3)], onStepApplied).catch(caught => caught);

    expect(isAppError(error, AppErrorCode.MIGRATION_FAILED)).toBe(true);
    expect(error.message).toBe('Migration to v2 failed');
    expect(error.cause).toBe(cause);
    expect(onStepApplied).toHaveBeenCalledWith(1);
    expect(onStepApplied).toHaveBeenCalledTimes(1);
  });

  it('does not wrap progress callback failures', async () => {
    await expect(runMigrations([], 0, [step(1)], () => {
      throw new Error('save failed');
    })).rejects.toThrow('save failed');
  });
});

describe('migrateData', () => {
  const steps: DataMigration[] = [
    { version: 2, up: data => ({ ...(data as object), two: true }) },
    { version: 1, up: data => ({ ...(data as object), one: true }) },
  ];

  it('applies pending steps in order', () => {
    expect(migrateData({}, 0, steps)).toEqual({ data: { one: true, two: true }, version: 2, changed: true });
    expect(migrateData({}, 1, steps)).toEqual({ data: { two: true }, version: 2, changed: true });
  });

  it('reports unchanged data when current', () => {
    const data = { a: 1 };
    const result = migrateData(data, 2, steps);

    expect(result.data).toBe(data);
    expect(result.changed).toBe(false);
  });

  it('keeps the current version when there are no steps', () => {
    expect(migrateData('x', 7, [])).toEqual({ data: 'x', version: 7, changed: false });
  });

  it('rejects newer records and gaps', () => {
    expect(() => migrateData({}, 3, steps)).toThrow('Record version 3 is newer than supported 2');
    expect(() => migrateData({}, 0, [steps[0]])).toThrow('Missing data migration step 1');
  });

  it('propagates step errors unwrapped', () => {
    expect(() => migrateData({}, 0, [{
      version: 1,
      up: () => {
        throw new TypeError('bad');
      },
    }])).toThrow(TypeError);
  });
});
