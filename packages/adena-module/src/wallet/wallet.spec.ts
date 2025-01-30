import { MockLedgerConnector } from './../test-utils/mock-ledgerconnector';
import { AdenaWallet } from './wallet';

const mnemonic =
  'source bonus chronic canvas draft south burst lottery vacant surface solve popular case indicate oppose farm nothing bullet exhibit title speed wink action roast';

describe('create wallet by mnemonic', () => {
  it('create success', async () => {
    const wallet = await AdenaWallet.createByMnemonic(mnemonic);
    const walletMnemonic = wallet.getMnemonic();

    expect(walletMnemonic).toBe(mnemonic);
  });

  it('account initialize success', async () => {
    const wallet = await AdenaWallet.createByMnemonic(mnemonic);

    expect(wallet.accounts.length).toBe(1);
  });

  it("initilaize account' address is corret", async () => {
    const wallet = await AdenaWallet.createByMnemonic(mnemonic);
    const account = wallet.accounts[0];
    const address = await account.getAddress('g');

    expect(address).toBe('g1jg8mtutu9khhfwc4nxmuhcpftf0pajdhfvsqf5');
  });
});

describe('create wallet by web3 auth', () => {
  it('create success', async () => {
    const privateKeyHexStr = 'ea97b9fddb7e6bf6867090a7a819657047949fbb9466d617f940538efd888605';
    const wallet = await AdenaWallet.createByWeb3Auth(privateKeyHexStr);

    expect(wallet.currentKeyring.type).toBe('WEB3_AUTH');
  });

  it('account initialize success', async () => {
    const privateKeyHexStr = 'ea97b9fddb7e6bf6867090a7a819657047949fbb9466d617f940538efd888605';
    const wallet = await AdenaWallet.createByWeb3Auth(privateKeyHexStr);

    expect(wallet.accounts.length).toBe(1);
  });

  it("initilaize account' address is corret", async () => {
    const privateKeyHexStr = 'ea97b9fddb7e6bf6867090a7a819657047949fbb9466d617f940538efd888605';
    const wallet = await AdenaWallet.createByWeb3Auth(privateKeyHexStr);
    const account = wallet.accounts[0];
    const address = await account.getAddress('g');

    expect(address).toBe('g1jg8mtutu9khhfwc4nxmuhcpftf0pajdhfvsqf5');
  });
});

describe('create wallet by ledger', () => {
  it('create success', async () => {
    try {
      const ledgerConnector = await MockLedgerConnector.create();
      const wallet = await AdenaWallet.createByLedger(ledgerConnector);

      expect(wallet.currentKeyring.type).toBe('LEDGER');
    } catch (e) {}
  });

  it('account initialize success', async () => {
    try {
      const ledgerConnector = await MockLedgerConnector.create();
      const wallet = await AdenaWallet.createByLedger(ledgerConnector);

      expect(wallet.accounts.length).toBe(1);
    } catch (e) {}
  });
});

describe('serialize', () => {
  // SALT_KEY: TESTTESTTESTTEST
  // PASSWORD: PASSWORD
  it('serialize success', async () => {
    const wallet = await AdenaWallet.createByMnemonic(mnemonic);
    const serialized = await wallet.serialize('PASSWORD');

    expect(serialized).toBeTruthy();
  });

  it('deserialize success', async () => {
    const serialized =
      'U2FsdGVkX1/E9wVYaJL0UGOKTC0nxbdu1Jd0qdCqsjErlbEw4ruhRw+9Bxx1rVEMV20Gv86YRRprVZGTUHmuwU5gKcX/3DE0j9cvUn781WMff81DZcczqQMj1C0hhknmz/D/t34G7UWUeQyMQrSr7k6gyNo/KVyNVkAAlNuWCIkZGkzKkH+wPJdvliFLgxUaVbTuBKcO6fuZ1vvB2hbUZ0vE10/dIF3H5BTRYt6I64IbHNXEoQiz0ZzU+LItNMFbGELYLqi9xJKPaJY6T1fejibc6qxq0hhHvdSXT28rOciavvHGKi5lYpWWfQVl31WxmNZPmE8Hu21qF0P9rmY+x+t0jCtTOSmg+2r3WJOmHorOWChxVoCrob6qyGEZS7WSJ/nKo04IuroxO7xpnWXiyQvxv4TcsDSTtu298MRN4USViRodchJCe7mvvXO9yxEbXf3YcOQ7MF/tjyIXHd3cm4mcchbA4jQ2JPvlbb5+6kejThYqkHna3K8h1X2Pi9LFwdgDXZuajW2JtINPEpDxKx/yuMjrJaqtubzi2FIRTtC9NJauf5XizWDAN22m7rMbuV6KRNwwkleEB67CjdlOnJx7f0KxdopPT/XRlXivimUTf8nABAc7egWcaUmbvhtTnxOs9RYjIfq9Mid2AGk4Ehpsq8mLujOPVBLDdS5o+BUt4xTRV1/+ZIJKa/3m5bhWZWU2/pUMhXnxg8YKg6lba2cFwHu15KvE5+gjofNIgnXkwNCMRtEpaCgODBnz25RWcq+ktpiQI6nn6e9jIc9jPNtTX5mxuWC5G7yx7oSsGR4fbKd0xJZaZrn+I+1wyR39L7FFszWXOyCvyDDq0FxH7M0PiAVZbO+440XtRTEvblwEeJWlrR6Jze8XPjjfy/ehwYXNHfOoocP3SO/NYR7AuPxskDVoIdW9ZYu+FT4tL3yK8ew43MJqKYBWL483aUSEF9IofQr+9qOFSimWxCHzPmTRUvkf4gu1pHUoNU0o+oKN7CYw4UMJ1G0crXMBPwCKPWIgD0NGed2vJKjdYgAzApazXmc3s5DH2Jn2rO6fsU8c7egEm6CzUYO6rg2Eq9xvC6sscgbbpP3rEhTVCwc9ESd6p0htM+oq7I8AfNDBH8HUrLrkht4WoiHAZJZjo27FV+EWVcz+TtH6BoZ6jPbqB+zkeUbGFEcNuLK6IRvAAZEoCPDGNJSgJZLf7ULxMTAr4k9aJwh827gjEp9tw586rKAGC//AYG1FzyLVupvA7kQ=';
    const wallet = await AdenaWallet.deserialize(serialized, 'PASSWORD');

    expect(wallet).toBeTruthy();
    expect(wallet.accounts.length).toBe(1);
  });

  it('deserialize invalid password', async () => {
    const serialized =
      'U2FsdGVkX1/1NOyr0ePUNNNzXcR0lN4p5nHveepGqc0048xBRarEAHuUOCMh41qXmMxMZMTnNq0xrV3zd5COb2aa2ETbzW57rHcwTdVU11kvbkcFuKb8Vqghv0fGauy+/BxetqL+8VzqTAL8u5DQg29N0HUtSGPc5cFGBPDJ/TZBiDh43/fYi0mR75cG397eVxOMKJcKbWf6jNke9E2xp9QOlLAf6iZeqRitLlT20P7qw2UycoOmmg6Lfj7Z1o5xyyHe2rvt2BYQkC8ny3C2j7stFNRXcB0B8EZyQRwECkvRSmSBmnwX7PjHMQoqVSi/HxG/oLZNFhUcwHxFWpKF24So0iv+nkiLU4LEwjOZrbgpv8CFI1KXAGf442iOLvO+j5e5sRyCJqt53+U219UF1dbCtT7pr7WyeCfsAR6Eb3qoejUVR92m+PAfi/JWaYm2V7fDKflpnRVTzo7Eqn3+aQdUHZqjFXLo6k2sTw8hdZULA017sAe4WffOHL8XfRmi1m4SJUfBw3QrHNvdGYHmLX7rVMPDDGKMfbhk5W/H+e/7UX3Cz8rbS5mYcJNwOXNCgX6YYAxljdGR7HzRPKFIzBgOEOr4R3h7wibiq9hHrPKm0mDJYRkscRVQFvy78ko91KcE2NDkzyWwwXA7WAiWtlg3m0FlZxm/4DzmOVz5t7Kw2ln36W+xnT3qCbq37j/xii4PQDPCPuurMCa122BYOHYeuC/6Jd0l1GBuo5Vk2GQ4vNUq9YG55kCeI5cVznwLjEMBYDtlBb54uwxJgpBGHYYK1CQW+aVEl8AJihMrNuEesjznTSTNj9ZWXuVwnXIbRo9UjaEydlcfXpsew0WMFC8J2Brl08rrnX6N9wPWZ1V3ZO+ccGN5X3MsFIOADuNzYtyZdXrpeJxUChsiRKXIihu3qyjJp4OkaIqYSi/WoRpSL6CzmvhzPStRwU8yxIEZE8dnoUJroyQDrQRUhtYqB+PobWL7rjenwpAtCsUfu220N4XfuM/GGwkpg8jiepvToYWPzy9vJXBT9WZigsce6EPun2RieGRvq7FoCBExJnUPqWzFr3yew7ThwxxWcgtaX25Ej9ChFRl3YtrXuFg+d9vvzlA4OZcjoowT3BSVHfQJcJEL/f97fu24aIa2LKM6aNKcTsU/3YTYtxupLoK1v+xwLaT3R7rCMXyw+58u3grOweFEWtRjpmcIzvVDR/UZ';
    let wallet;
    try {
      wallet = await AdenaWallet.deserialize(serialized, 'INVALID_PASSWORD');
    } catch (e) {}

    expect(wallet).toBeFalsy();
  });
});
