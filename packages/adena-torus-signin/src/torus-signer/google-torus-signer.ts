import { TorusSigner } from "./torus-signer";

export class GoogleTorusSigner implements TorusSigner {

  public init = (): Promise<boolean> => {
    return Promise.resolve(false);
  }

  public connect = (): Promise<boolean> => {
    return Promise.resolve(false);
  }

  public disconnect = (): Promise<boolean> => {
    return Promise.resolve(true);
  }

  public getPrivateKey = async (): Promise<string> => {
    throw new Error("Not initialized web3 provider.");
  }

  public static create() {
    return new GoogleTorusSigner();
  }
}