import { isMasterRequestsAllowed } from './agent-host-settings';
import { AGENT_MASTER_REQUESTS_STORAGE_KEY } from './agent-host-protocol';

const mockStoredValue = (value: unknown): void => {
  (globalThis as unknown as { chrome: unknown }).chrome = {
    storage: {
      local: {
        get: jest
          .fn()
          .mockResolvedValue(
            value === undefined ? {} : { [AGENT_MASTER_REQUESTS_STORAGE_KEY]: value },
          ),
      },
    },
  };
};

describe('isMasterRequestsAllowed', () => {
  it('is off when the setting was never saved', async () => {
    mockStoredValue(undefined);
    await expect(isMasterRequestsAllowed()).resolves.toBe(false);
  });

  it('is on only for an explicit true', async () => {
    mockStoredValue(true);
    await expect(isMasterRequestsAllowed()).resolves.toBe(true);

    mockStoredValue('true');
    await expect(isMasterRequestsAllowed()).resolves.toBe(false);
  });
});
