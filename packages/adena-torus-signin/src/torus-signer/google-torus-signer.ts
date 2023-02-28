import { CHAIN_NAMESPACES, WALLET_ADAPTERS } from "@web3auth/base";
import { Web3AuthCore } from "@web3auth/core";
import { OpenloginAdapter } from "@web3auth/openlogin-adapter";
import { TorusSigner } from "./torus-signer";

export class GoogleTorusSigner implements TorusSigner {

  private web3auth: Web3AuthCore;

  constructor(web3auth: Web3AuthCore) {
    this.web3auth = web3auth;
  }

  public init = (): Promise<boolean> => {
    return this.web3auth.init()
      .then(() => true)
      .catch(() => false);
  }

  public connect = (): Promise<boolean> => {
    const connectOption = { loginProvider: "google" };
    return this.web3auth.connectTo(WALLET_ADAPTERS.OPENLOGIN, connectOption)
      .then(() => true)
      .catch(error => {
        if (error?.name === "WalletLoginError") {
          return true;
        }
        return false;
      });
  }

  public disconnect = (): Promise<boolean> => {
    return this.web3auth.logout({ cleanup: true })
      .then(() => true)
      .catch(() => false);
  }

  public getPrivateKey = async (): Promise<string> => {
    if (!this.web3auth.provider) {
      throw new Error("Not initialized web3 provider.");
    }
    const privateKey = await this.web3auth.provider.request({
      method: "private_key"
    })
    return `${privateKey}`;
  }

  public static create() {
    const clientId = "";
    const web3auth = new Web3AuthCore({
      clientId,
      web3AuthNetwork: "testnet",
      chainConfig: {
        chainNamespace: CHAIN_NAMESPACES.OTHER,
        chainId: "0x1",
        rpcTarget: "https://rpc.test3.gno.land",
      },
    });

    const openloginAdapter = new OpenloginAdapter({
      adapterSettings: {
        clientId,
        uxMode: "popup",
        loginConfig: {
          google: {
            name: "Adenna",
            verifier: "adena-wallet",
            clientId: "",
            typeOfLogin: "google",
          },
        },
      },
    });
    web3auth.configureAdapter(openloginAdapter);
    return new GoogleTorusSigner(web3auth);
  }
}