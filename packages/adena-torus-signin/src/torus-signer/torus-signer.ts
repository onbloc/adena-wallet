export interface TorusSigner {
  init: () => Promise<boolean>;

  connect: () => Promise<boolean>;

  disconnect: () => Promise<boolean>;

  getPrivateKey: () => Promise<string>;
}