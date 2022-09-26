const container = document.head || document.documentElement;
const scriptElement = document.createElement('script');

scriptElement.src = chrome.runtime.getURL('inject.js');
scriptElement.type = 'text/javascript';
container.insertBefore(scriptElement, container.children[0]);
scriptElement.remove();

window.addEventListener(
  'message',
  function (event) {
    if (event.data.type && event.data.type === 'TOCS_DoContractPopup') {
      chrome.runtime.sendMessage(
        {
          type: 'TOBG_DoContractPopup',
          data: event.data.data,
        },
        (response) => {
          // console.log('contentScript', response);
          event.source?.postMessage(response);
        },
      );
    } else if (event.data.type && event.data.type === 'TOCS_GetAccount') {
      chrome.runtime.sendMessage(
        {
          type: 'TOBG_GetAccount',
          data: event.data.data,
        },
        (response) => {
          event.source?.postMessage(response);
        },
      );
    }
  },
  false,
);
