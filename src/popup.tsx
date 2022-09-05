import * as React from 'react';
import * as ReactDOM from 'react-dom';

import App from './App';

const mountNode = document.getElementById('popup');
ReactDOM.render(<App />, mountNode);

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // contract type set
  (document.getElementById('atv_contract') as HTMLElement).innerHTML = request.data.msgs[0].type;

  // set contract func
  if (request.data.msgs[0].type === '/vm.m_call') {
    (document.getElementById('atv_function') as HTMLElement).innerHTML =
      request.data.msgs[0].value.func;
  } else {
    (document.getElementById('atv_function') as HTMLElement).innerHTML = 'Transfer';
  }

  (document.getElementById('atv_args') as HTMLInputElement).value = JSON.stringify(request.data);
  // (document.getElementById('atv_args') as HTMLElement).innerHTML = JSON.stringify(request.data);

  //sendResponse("SEND from test.js");
});
