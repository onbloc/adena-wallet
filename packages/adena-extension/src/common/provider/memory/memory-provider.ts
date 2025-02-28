const EXPIRED_PASSWORD_DURATION_MIN = 5;

export class MemoryProvider {
  private memory: Map<string, any> = new Map();
  private activeConnections = 0;
  private expiredPasswordDuration = EXPIRED_PASSWORD_DURATION_MIN;
  private expiredTime: number | null = null;

  public get = <T = any>(key: string): T | null => {
    if (!this.memory.get(key)) {
      return null;
    }

    return this.memory.get(key) as T;
  };

  public set = <T = any>(key: string, value: T | null): void => {
    this.memory.set(key, value);
  };

  public async init(): Promise<void> {
    this.memory = new Map();
  }

  public addConnection(): void {
    this.activeConnections++;
  }

  public removeConnection(): void {
    this.activeConnections--;
  }

  public isActive(): boolean {
    return this.activeConnections > 0;
  }

  public getExpiredPasswordDurationTime(): number {
    return this.expiredPasswordDuration * 60 * 1000;
  }

  public setExpiredPasswordDurationMinutes(duration: number): void {
    this.expiredPasswordDuration = duration;
  }

  public isExpired(time: number): boolean {
    if (this.isActive()) {
      return false;
    }

    if (!this.expiredTime) {
      return false;
    }

    return this.expiredTime < time;
  }

  public updateExpiredTimeBy(time: number | null): void {
    this.expiredTime = time;
  }
}
