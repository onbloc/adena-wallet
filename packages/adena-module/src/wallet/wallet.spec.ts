import { MockLedgerConnector } from './../test-utils/mock-ledgerconnector';
import { AdenaWallet } from './wallet';

const mnemonic =
  'source bonus chronic canvas draft south burst lottery vacant surface solve popular case indicate oppose farm nothing bullet exhibit title speed wink action roast';

describe('create wallet by mnemonic', () => {
  it('create success', async () => {
    const wallet = await AdenaWallet.createByMnemonic(mnemonic);
    const walletMnemonic = wallet.mnemonic;

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
      'U2FsdGVkX1+vUpoJEgX2E4Wsyl+PmwfSAv1k6mO8UJ8Q6vlmJ279Ap7asAoLSBO97TAZ8MSbB859aVC6T0RsdKmtf96ZymI0JqvLiNIcr7v8iPtEqE+Jgfu6umTsBUnMilo/bC89Y3OlfCQ6xaaWeYpfOZzcQC27twXAndDGTXIrGy5W+P9tr0IUE94BwON8LC9j0L2md2qnF/tAw/MNp9neKszWxNT1J8xtSjIjpQulRnz0bhbYuZoV4casjTSWEvzqY9+QYY2PXrRmU3gdvaXtxe05n+Y0k36MmPRVnqYM1Gumvs0LRDKrTSLhAG8xHndO7uvuM1sVbJUpmWsQ/QvBNepxga+JS4Fn4kG9cR4g/dAKkha6dSUJBQmkP7ZD4Sf+6scBFhvM0/jidKyMaj6J6h+6DbHT/Uoh16Fj2gpuFpfx0xr9ZrtaKH788rEo56WKbmZLUnHmjx/5FtEGiI47ocm5XRinFa7KlYDS4uDgVf+mG6+qNTtZ8NRBTdVfMjtnfGWJgQ+6U6WGN97Y5cMHIgdjPgVN42IYjO5galE3XaEvbZfkQVZBDa+k6IR4C8e7F+Mq+16I8kRKJPSTyHeVeo4GUqa1+IxaXKHGzB1SHV1cHLbBn7tkm2Dr4tdJoAt4JrusvPbL/TLSQg2YdNH9zzBqYlU05846Lgs1hniBHlJ00gKSB7C7vPJtBQerDAnwyOiRjVXih8/D40OPXue5RXY2EZK3+zsQNq5/D1BK8JR+PZo2+BYhuUQwxu5OXSpbeles6I3ZR/scgf05zMtXRTPbO28whAWbt6s+OKC8N+3oBUXlVe/cDX+GJHJcmwd1nIJu/TDggrsuMZ5Z16kEeaEhQ5Y/L8UJ3vvzWyMS96F9GzVP3UncKmKt2qgoYleeix1vHW5m+W6WDXyn/7IUvtyPQnDuCGvWCQ5e7s7Yv20/zHFrm2kMbt5FPMITmRhSU9ARPu6JXco/mQ6UrsQvfZjpQNxDtmWDT+kNt/Ku5OZrLmmqyQImY6rdD37l4GBu6Zqape0WCtoMS4UJVCojydEPsX4wc5MSwjgAv2Nj2cLkofhJKcNjWdKrAr3WxPHDFiThejEpx35Kf7Y4Xw6x7ci+iaYXHkJkcmFp65QV9+en76YyW1zIMJ00nK4T5BML3w9MghE0IfmrhFc0H23Qck/WumRqJ46IH7jISx8ZmtsNdG7gS/na124Vu6zv';
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
