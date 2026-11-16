declare global {
  /**
   * params:changed event detail
   */
  interface GnoWebParamsChangedDetail {
    pkgPath: string;
    funcName: string;
    params: Record<string, string>;
    send?: string;
  }

  /**
   * mode:changed event detail
   */
  interface GnoWebModeChangedDetail {
    mode: 'fast' | 'secure';
  }

  /**
   * address:changed event detail
   */
  interface GnoWebAddressChangedDetail {
    address: string;
  }

  /**
   * Document event map
   */
  interface DocumentEventMap {
    'params:changed': CustomEvent<GnoWebParamsChangedDetail>;
    'mode:changed': CustomEvent<GnoWebModeChangedDetail>;
    'address:changed': CustomEvent<GnoWebAddressChangedDetail>;
  }
}

export {};
