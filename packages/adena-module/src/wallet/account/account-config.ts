export class WalletAccountConfig {
  private chainId: string;
  private coinDenom: string;
  private coinMinimalDenom: string;
  private coinDecimals: number;

  constructor(config: {
    chainId: string;
    coinDenom: string;
    coinMinimalDenom: string;
    coinDecimals: number;
  }) {
    this.chainId = config.chainId;
    this.coinDenom = config.coinDenom;
    this.coinMinimalDenom = config.coinMinimalDenom;
    this.coinDecimals = config.coinDecimals;
  }

  public get data() {
    return {
      chainId: this.chainId,
      coinDenom: this.coinDenom,
      coinMinimalDenom: this.coinMinimalDenom,
      coinDecimals: this.coinDecimals,
    };
  }

  public clone = () => {
    return new WalletAccountConfig(this.data);
  };

  public getChainId = () => {
    return this.chainId;
  };

  public getCoinDenom = () => {
    return this.coinDenom;
  };

  public getCoinMinimalDenom = () => {
    return this.coinMinimalDenom;
  };

  public getCoinDicimals = () => {
    return this.coinDecimals;
  };

  public static createConfigByTest2 = () => {
    return new WalletAccountConfig({
      chainId: 'test2',
      coinDenom: 'UGNOT',
      coinMinimalDenom: 'ugnot',
      coinDecimals: 6,
    });
  };
}
