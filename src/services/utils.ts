import { coins, Token } from './config';
import { v4 as uuidv4 } from 'uuid';
import CryptoJS from 'crypto-js';
import gnot from '../assets/gnot-logo.svg';
import { Secp256k1HdWallet } from './signer';

export function formatAddress(wallet: string): string {
  return ellideMiddle(wallet, 24);
}

export function ellideMiddle(str: string, maxOutLen: number): string {
  if (str.length <= maxOutLen) {
    return str;
  }
  const ellide = '…';
  const frontLen = Math.ceil((maxOutLen - ellide.length) / 2);
  const tailLen = Math.floor((maxOutLen - ellide.length) / 2);
  return str.slice(0, frontLen) + ellide + str.slice(str.length - tailLen, str.length);
}

export function getTokenConfig(denom: string): Token | undefined {
  return coins.find((c: any) => c.denom === denom);
}

export function formatPrice(price: { amount: string; denom: string }): string {
  const coin = getTokenConfig(price.denom)!;
  const amount = parseInt(price.amount) / Math.pow(10, coin.decimals);

  return amount + ' ' + coin.name;
}

export function toMinDenom(amount: number, denom: string): string {
  const coin = getTokenConfig(denom)!;
  return Math.floor(amount * Math.pow(10, coin.decimals)).toString();
}

export function parseResultId(base64Data: string): string {
  if (!base64Data) {
    return '';
  }

  const raw = atob(base64Data);
  const regExp = /\((\d+) /;

  const match = raw.match(regExp);
  if (!match) {
    return '';
  }

  return match[1];
}

export function parseBoards(raw: string): string[] {
  if (!raw) {
    return [];
  }

  const regExp = /\(([^)]+)\)/g;
  const matches = raw.match(regExp);
  if (!matches) {
    return [];
  }

  return matches.map((str) => str.substring(1, str.length - 1));
}

export function numberWithCommas(num: number) {
  const parts = num.toString().split('.');
  return parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',') + (parts[1] ? '.' + parts[1] : '');
}

export function encryption(plainPassword: string) {
  const cipherKey = uuidv4(); // OTP

  const encryptedPassword = CryptoJS.AES.encrypt(plainPassword, cipherKey).toString();

  const encryptedKey = CryptoJS.AES.encrypt(cipherKey, 'r3v4').toString();

  // @ts-ignore
  chrome.storage.session.set(
    {
      encryptedPassword,
      encryptedKey,
    },
    function () {
      // console.log("Good");
      return true;
    },
  );
}

export function decryption(encryptedPassword: string, encryptedKey: string) {
  const decryptedCipherKey = CryptoJS.AES.decrypt(encryptedKey, 'r3v4');
  const cipherKey = decryptedCipherKey.toString(CryptoJS.enc.Utf8);

  if (cipherKey === '') {
    // console.log("CipherKey Decryption Failed");
    throw new Error('CipherKey Decryption Failed');
  }

  const decryptedPassword = CryptoJS.AES.decrypt(encryptedPassword, cipherKey);
  const plainPassword = decryptedPassword.toString(CryptoJS.enc.Utf8);

  if (plainPassword === '') {
    // console.log("Password Decryption Failed");
    throw new Error('Password Decryption Failed');
  }

  return plainPassword;
}

export function parseTxsEachDate(txs: object[], address: string) {
  return txs.reduce((o: any, cur: any) => {
    const k = cur.time.slice(0, 10);

    if (o[k]) {
      if (cur.from === address) {
        o[k].transaction.push({
          nftImg: gnot,
          nftType: '',
          account: addr_reducer(cur.from),
          amount: amount_splitter(cur.amount),
          addr: address,
          protoType: cur,
        });
      } else if (cur.to === address) {
        o[k].transaction.push({
          nftImg: gnot,
          nftType: '',
          account: addr_reducer(cur.to),
          amount: amount_splitter(cur.amount),
          addr: address,
          protoType: cur,
        });
      }
    } else {
      if (cur.from === address) {
        o[k] = {
          date: k,
          transaction: [
            {
              nftImg: gnot,
              nftType: '',
              account: addr_reducer(cur.from),
              amount: amount_splitter(cur.amount),
              addr: address,
              protoType: cur,
            },
          ],
        };
      } else if (cur.to === address) {
        o[k] = {
          date: k,
          transaction: [
            {
              nftImg: gnot,
              nftType: '',
              account: addr_reducer(cur.to),
              amount: amount_splitter(cur.amount),
              addr: address,
              protoType: cur,
            },
          ],
        };
      }
    }
    return o;
  }, {});
}

const addr_reducer = (addr: string) => {
  return addr.slice(0, 3) + '...' + addr.slice(-3);
};

const amount_splitter = (amt: string) => {
  return parseFloat(parseFloat(amt).toFixed(6)).toLocaleString('en-US', {
    minimumFractionDigits: 6,
  });
};

export function editNick(rawNick: string) {
  // chrome.storage.local.get(["adenaWalletNicks"], (result: any) => {
  //   console.log(result["adenaWalletNicks"]);
  // });

  if (rawNick === '') {
    return 'Account 1';
  } else if (rawNick.length > 10) {
    return rawNick.slice(0, 10) + '...';
  }

  return 'hello_nick';
}
