export type AccountInfo = {
  index: number;
  address: string;
  // hdPath is the BIP44 address index. account'/change default to 0 when absent.
  hdPath: number;
  accountIndex?: number;
  changeIndex?: number;
  stored: boolean;
  selected: boolean;
};
