import { KeyValueStore } from '../storage/key-value-store';
import { MigrationStep } from './migration-runner';

// Append a new step for every structural change of general storage; never edit shipped steps.
export const GENERAL_MIGRATIONS: MigrationStep<KeyValueStore>[] = [
  {
    version: 1,
    description: 'Initial general storage schema',
    up: (): void => {},
  },
];
