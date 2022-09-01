import * as React from 'react';
import { OfflineAminoSigner } from '@cosmjs/amino';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { AppConfig } from '../config/network';
import { createGnoClient, createOlbClient } from './sdk';
import { GnoClient } from '../lcd';
import { OblClient } from '../obl';
import { Coin } from '../types';
import axios from 'axios';

interface GnoContextType {
  readonly initialized: boolean;
  readonly init: (signer: OfflineAminoSigner) => void;
  readonly clear: () => void;
  readonly config: Partial<AppConfig>;
  readonly gnoClient: GnoClient | undefined;
  readonly explorerClient: OblClient | undefined;
  readonly changeConfig: (updates: Partial<AppConfig>) => void;
  readonly address: string;
  readonly balance: readonly Coin[];
  readonly refreshBalance: () => Promise<void>;
  readonly getSigner: () => OfflineAminoSigner | undefined;
  readonly changeSigner: (newSigner: OfflineAminoSigner) => void;
  readonly addrname: string[];
  addrnameChange: (text: string) => void;
}

function throwNotInitialized(): any {
  throw new Error('Not yet initialized');
}

const defaultContext: GnoContextType = {
  initialized: false,
  init: throwNotInitialized,
  clear: throwNotInitialized,
  config: {},
  gnoClient: undefined,
  explorerClient: undefined,
  changeConfig: throwNotInitialized,
  address: '',
  balance: [],
  refreshBalance: throwNotInitialized,
  getSigner: () => undefined,
  changeSigner: throwNotInitialized,
  addrname: ['Account 1'],
  addrnameChange: throwNotInitialized,
};

const GnoContext = React.createContext<GnoContextType>(defaultContext);

export const useSdk = (): GnoContextType => React.useContext(GnoContext);

interface SdkProviderProps extends React.HTMLAttributes<HTMLOrSVGElement> {
  readonly config: AppConfig;
}

export function SdkProvider({ config: configProp, children }: SdkProviderProps): JSX.Element {
  const [config, setConfig] = useState(configProp);
  const [signer, setSigner] = useState<OfflineAminoSigner>();
  const [gnoClient, setgnoClient] = useState<GnoClient>();
  const [explorerClient, setexploereClient] = useState<OblClient>();

  const contextWithInit = useMemo(() => ({ ...defaultContext, init: setSigner }), []);
  const [value, setValue] = useState<GnoContextType>(contextWithInit);

  const clear = useCallback(() => {
    setValue({ ...contextWithInit });
    setgnoClient(undefined);
    setexploereClient(undefined);
    setSigner(undefined);
    setConfig(configProp);
  }, [contextWithInit, configProp]);

  function changeConfig(updates: Partial<AppConfig>): void {
    setConfig((config) => ({ ...config, ...updates }));
  }

  const addrnameChange = (text: string) => {
    chrome.storage.local.set({
      adenaWalletNicks: text === '' ? 'Account 1' : text,
    });
    setValue((prev) => ({
      ...prev,
      addrname: text === '' ? ['Account 1'] : [text],
    }));
  };

  const refreshBalance = useCallback(
    async (address: string, balance: Coin[]): Promise<void> => {
      if (!gnoClient) return;

      balance.length = 0;
      const response = await gnoClient.getBalance(address);
      if (response && response.length > 0 && balance.length === 0) {
        response.map((it) => {
          it.amount = it.amount.replace(',', '');
          balance.push(it);
        });
      }
    },
    [gnoClient],
  );

  useEffect(() => {
    (async () => {
      let netconf;
      if (process.env.REACT_APP_IS_DEV === 'dev') {
        netconf = config;
      } else {
        netconf = await (await axios.get<AppConfig>('https://conf.adena.app/net.json')).data;
      }
      const gnoClient = createGnoClient(netconf);
      const explorerClient = createOlbClient(netconf);
      setgnoClient(gnoClient);
      setexploereClient(explorerClient);
      setValue({ ...contextWithInit, gnoClient });
    })();
  }, [contextWithInit, config]);

  useEffect(() => {
    if (!signer || !gnoClient) return;

    const balance: Coin[] = [];
    let addrname: string[] = ['Account 1'];
    chrome.storage.local.get(['adenaWalletNicks'], (result) => {
      if (result.adenaWalletNicks) {
        addrname = [result.adenaWalletNicks];
      } else {
        addrname = ['Account 1'];
      }
    });

    (async function updateValue(): Promise<void> {
      const address = (await signer.getAccounts())[0].address;

      await refreshBalance(address, balance);

      setValue({
        initialized: true,
        init: () => {},
        clear,
        config,
        gnoClient,
        explorerClient,
        changeConfig,
        address,
        balance,
        refreshBalance: refreshBalance.bind(null, address, balance),
        getSigner: () => signer,
        changeSigner: setSigner,
        addrname,
        addrnameChange,
      });
    })();
  }, [signer, clear, gnoClient, explorerClient, config, refreshBalance]);

  return <GnoContext.Provider value={value}>{children}</GnoContext.Provider>;
}
