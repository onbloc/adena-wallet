export interface AbciQueryAuthAccount {
  BaseAccount: {
    address: string;
    coins: string;
    public_key: string | null;
    account_number: string;
    sequence: string;
  };
}
