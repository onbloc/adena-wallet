// A clock moved backwards also locks, so changing the time cannot extend a session.
export const shouldAutoLock = (since: number, now: number, windowMs: number): boolean => {
  const elapsed = now - since;

  return elapsed < 0 || elapsed >= windowMs;
};
