export class MemoryProvider {
  private memory: Map<string, any> = new Map();

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
}
