// Runs at most `limit` tasks at once; the rest wait in call order.
export class ConcurrencyLimiter {
  private active = 0;
  private readonly waiting: (() => void)[] = [];

  constructor(private readonly limit: number) {}

  async run<T>(task: () => Promise<T>): Promise<T> {
    if (this.active >= this.limit) {
      // The finishing task hands its slot over, so `active` is not incremented here.
      await new Promise<void>(resolve => this.waiting.push(resolve));
    }
    else {
      this.active++;
    }

    try {
      return await task();
    }
    finally {
      const next = this.waiting.shift();

      if (next) {
        next();
      }
      else {
        this.active--;
      }
    }
  }
}
