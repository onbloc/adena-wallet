export const SESSION_CREATION_GRACE_MS = 120_000;
export const SESSION_MISSING_RECHECK_DELAY_MS = 1_500;

export interface SessionCreationMetadata {
  createdAt?: number;
}

export const waitForSessionRecheck = (ms = SESSION_MISSING_RECHECK_DELAY_MS): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

export const isSessionInCreationGrace = (
  metadata: SessionCreationMetadata | null | undefined,
  nowMs = Date.now(),
): boolean => {
  if (!metadata?.createdAt) {
    return true;
  }
  return nowMs - metadata.createdAt * 1000 < SESSION_CREATION_GRACE_MS;
};

export const shouldConvertMissingSession = async (
  metadata: SessionCreationMetadata | null | undefined,
  recheck: () => Promise<boolean>,
): Promise<boolean> => {
  if (isSessionInCreationGrace(metadata)) {
    return false;
  }

  await waitForSessionRecheck();
  return !(await recheck());
};
