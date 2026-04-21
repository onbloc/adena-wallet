import {
  AUTH_CONNECTION,
  authConnector,
  CHAIN_NAMESPACES,
  CommonPrivateKeyProvider,
  UX_MODE,
  WALLET_CONNECTORS,
  Web3AuthNoModal,
  type CustomChainConfig,
  type WEB3AUTH_NETWORK_TYPE
} from '@web3auth/no-modal';

import { TorusSigner, TorusSignerConfig } from './torus-signer';


export class GoogleTorusSigner implements TorusSigner {
  private web3auth: Web3AuthNoModal;

  constructor(web3auth: Web3AuthNoModal) {
    this.web3auth = web3auth;
  }

  public init = async (): Promise<boolean> => {
    try {
      await this.web3auth.init();
      return true;
    } catch {
      return false;
    }
  };

  public connect = async (): Promise<boolean> => {
    try {
      await this.web3auth.connectTo(WALLET_CONNECTORS.AUTH, {
        authConnection: AUTH_CONNECTION.GOOGLE,
      });
      return true;
    } catch {
      return false;
    }
  };

  public disconnect = async (): Promise<boolean> => {
    try {
      await this.web3auth.logout({ cleanup: true });
      return true;
    } catch {
      return false;
    }
  };

  public getPrivateKey = async (): Promise<string> => {
    if (!this.web3auth.provider) {
      throw new Error('Not initialized web3 provider.');
    }
    const privateKey = await this.web3auth.provider.request<undefined, string>({ method: 'private_key' });
    return `${privateKey}`;
  };

  public static create(config: TorusSignerConfig) {
    const chainConfig: CustomChainConfig = {
      chainNamespace: CHAIN_NAMESPACES.OTHER,
      chainId: config.chainId,
      rpcTarget: config.rpcTarget,
      displayName: config.displayName,
      tickerName: config.tickerName,
      ticker: config.ticker,
      blockExplorerUrl: config.blockExplorerUrl,
      logo: config.logo,
    };

    const privateKeyProvider = new CommonPrivateKeyProvider({
      config: {
        chain: chainConfig,
        chains: [chainConfig],
      },
    });

    const web3auth = new Web3AuthNoModal({
      clientId: config.web3AuthClientId,
      web3AuthNetwork: config.web3AuthNetwork as WEB3AUTH_NETWORK_TYPE,
      privateKeyProvider,
      connectors: [
        authConnector({
          connectorSettings: {
            uxMode: UX_MODE.POPUP,
          },
        }),
      ],
    });

    return new GoogleTorusSigner(web3auth);
  }
}
