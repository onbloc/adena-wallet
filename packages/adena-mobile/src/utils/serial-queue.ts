// Runs tasks one at a time in call order; a failed task does not block the ones after it.
export class SerialQueue {
  private tail: Promise<unknown> = Promise.resolve();

  run<T>(task: () => Promise<T>): Promise<T> {
    const result = this.tail.then(task, task);

    this.tail = result.catch(() => undefined);
    return result;
  }
}
