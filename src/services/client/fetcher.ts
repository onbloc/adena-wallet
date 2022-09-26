import { RoutePath } from '@router/path';
import { Secp256k1HdWallet } from '@services/signer';
import { decryption, encryption } from '@services/utils';
import { useNavigate } from 'react-router-dom';
import { useSdk } from '@services/client';

export const getSavedPassword = (): Promise<string> => {
  return new Promise((resolve, reject) => {
    try {
      chrome.storage.session.get(
        {
          encryptedPassword: '',
          encryptedKey: '',
        },
        (result: any) => {
          if (result.encryptedPassword && result.encryptedKey) {
            // decrypt and route
            const plainPassword = decryption(result.encryptedPassword, result.encryptedKey);
            resolve(plainPassword);
          } else {
            // TODO using reject
            reject('1000');
          }
        },
      );
    } catch (err) {
      reject(err);
    }
  });
};

export const walletDeserialize = (plainPass: string): Promise<any> => {
  return new Promise((resolve, reject) => {
    try {
      chrome.storage.local.get(['adenaWallet'], async (result) => {
        if (result.adenaWallet) {
          try {
            const wallet = await Secp256k1HdWallet.deserialize(result.adenaWallet, plainPass);
            if (wallet) {
              encryption(plainPass);
              resolve(wallet);
            } else {
              reject();
            }
          } catch (err) {
            reject(err);
          }
        } else {
          reject(new Error('adenaWallet is not found'));
        }
      });
    } catch (err) {
      reject(err);
    }
  });
};
