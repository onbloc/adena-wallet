import { Secp256k1HdWallet } from '@services/signer';
import axios from 'axios';
import { GnoClient } from '@services/lcd';
import fetchAdapter from '@vespaiach/axios-fetch-adapter';
import { getSavedPassword } from '@services/client/fetcher';

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    chrome.tabs.create(
      {
        url: chrome.runtime.getURL('/install.html'),
      },
      (tab) => {},
    );
  } else if (details.reason === 'update') {
    // chrome.tabs.create(
    //   {
    //     url: 'https://medium.com/@adena.app',
    //   },
    //   (tab) => {},
    // );
  }
});

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  if (request.type === 'TOBG_DoContractPopup') {
    chrome.storage.local.get(['adenaWallet'], function (result) {
      if (result.adenaWallet) {
        chrome.windows.create(
          {
            url: chrome.runtime.getURL('popup.html#/wallet/approve-transaction-login'),
            type: 'popup',
            height: 600,
            width: 360,
            left: 800,
            top: 300,
          },
          function (response: any) {
            chrome.tabs.onUpdated.addListener(function (tabId, info) {
              let _a;
              if (
                info.status == 'complete' &&
                tabId ===
                  ((_a = response === null || response === void 0 ? void 0 : response.tabs[0]) ===
                    null || _a === void 0
                    ? void 0
                    : _a.id)
              ) {
                chrome.tabs.sendMessage(
                  response.tabs[0].id,
                  {
                    type: 'TO_POPUP_WINDOW',
                    data: request.data,
                    called: sender.origin,
                  },
                  function (popupResponse) {
                    chrome.runtime.onMessage.addListener(
                      (tmpRequest, tmpSender, tmpSendResponse) => {
                        if (tmpRequest.type === 'RETURN_TX_RESULT') {
                          tmpSendResponse(tmpRequest.data);
                          sendResponse(tmpRequest.data);
                          return true;
                        }
                        return true;
                      },
                    );
                    // sendResponse(myRes);
                  },
                );
              }
            });
          },
        );
      } else {
        // No Wallet
        sendResponse('1001');
      }
    });
    return true;
  } else if (request.type === 'TOBG_GetAccount') {
    chrome.storage.local.get(['adenaWallet'], function (result) {
      const walletString = result.adenaWallet;

      if (walletString === undefined) {
        sendResponse('1001');
      }

      (async () => {
        try {
          const savedPassword = await getSavedPassword();

          const wallet = await Secp256k1HdWallet.deserialize(walletString, savedPassword as string);
          const ret = (await wallet.getAccounts())[0];
          const test = new GnoClient(
            axios.create({
              baseURL: 'https://rpc.test2.gno.land/',
              timeout: 1 * 1000,
              adapter: fetchAdapter,
            }),
          );
          const res = await test.getAccount(ret.address);

          sendResponse(res);
        } catch (err) {
          sendResponse(err);
        }
      })();
    });

    return true;
  }
});
