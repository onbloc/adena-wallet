interface BaseErrorParams {
  type: string;
  status: number;
  message?: string;
}

export class BaseError extends Error {
  private status: number;

  private type: string;

  private occuredAt: number;

  constructor(errorInfo: BaseErrorParams) {
    const { type, status } = errorInfo;
    super(`${type} (status: ${status})`);
    this.status = status;
    this.type = type;
    this.occuredAt = Date.now();
    this.message = errorInfo.message ?? `${type}`;
    Object.setPrototypeOf(this, BaseError.prototype);
  }

  public getStatus = () => {
    return this.status;
  };

  public getType = () => {
    return this.type;
  };

  public getOccuredAt = () => {
    return this.occuredAt;
  };
}
