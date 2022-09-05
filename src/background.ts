import { Secp256k1HdWallet } from '@services/signer';
import axios from 'axios';
import { GnoClient } from '@services/lcd';
import fetchAdapter from '@vespaiach/axios-fetch-adapter';
import { getSavedPassword } from '@services/client/fetcher';
import session = chrome.storage.session;

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  if (request.type === 'TOBG_DoContractPopup') {
    chrome.storage.local.get(['adenaWallet'], function (result) {
      if (result.adenaWallet) {
        chrome.windows.create(
          {
            url: chrome.runtime.getURL('popup.html#/wallet/approve-transaction-login'),
            type: 'popup',
            height: 600,
            width: 380,
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
                  function (my_res) {
                    // console.log(my_res);
                  },
                );
              }
            });
          },
        );
      } else {
        sendResponse('9000'); // gno error
      }
    });
    return true;
  } else if (request.type === 'TOBG_GetAccount') {
    chrome.storage.local.get(['adenaWallet'], function (result) {
      const walletString = result.adenaWallet;

      (async () => {
        try {
          const sessionpass = await getSavedPassword();

          const wallet = await Secp256k1HdWallet.deserialize(walletString, sessionpass as string);
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
