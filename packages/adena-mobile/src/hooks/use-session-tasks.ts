import { useEffect, useState } from 'react';

import { useContainer } from '../di/container-provider';
import { isTaskPending, SessionTask } from '../domain/session-task';

const TICK_MS = 1000;

// A card's self-signed sends, re-read on every change; ticks each second while one is pending for its countdown.
export const useSessionTasks = (sessionAddress: string): { tasks: SessionTask[]; now: number } => {
  const { sessionTaskService } = useContainer();
  const [tasks, setTasks] = useState(() => sessionTaskService.list(sessionAddress));
  const [now, setNow] = useState(Date.now);

  useEffect(() => sessionTaskService.subscribe(() => setTasks(sessionTaskService.list(sessionAddress))), [sessionAddress, sessionTaskService]);

  const pending = tasks.some(isTaskPending);

  useEffect(() => {
    if (!pending) {
      return;
    }

    const timer = setInterval(() => setNow(Date.now()), TICK_MS);

    return (): void => clearInterval(timer);
  }, [pending]);

  return { tasks, now };
};
