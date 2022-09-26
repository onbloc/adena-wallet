import * as React from 'react';
import * as ReactDOM from 'react-dom';

import App from './App';

const mountNode = document.getElementById('popup');
ReactDOM.render(<App />, mountNode);

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'TO_POPUP_WINDOW') {
    (document.getElementById('atv_contract') as HTMLElement).innerHTML = request.data.msgs[0].type;

    // set contract func
    if (request.data.msgs[0].type === '/vm.m_call') {
      (document.getElementById('atv_function') as HTMLElement).innerHTML =
        request.data.msgs[0].value.func;
    } else {
      (document.getElementById('atv_function') as HTMLElement).innerHTML = 'Transfer';
    }

    // set rest params
    let restData;
    restData = request.data;
    restData['origin'] = request.called;
    (document.getElementById('atv_args') as HTMLInputElement).value = JSON.stringify(restData);

    // 여기서 리턴이 없으니 백그라운드.js #38 myRes가 아무것도 없어서 리턴이 안 되는 듯
    // 이걸 어떻게 해결한다...;;
    // sendResponse('might...');
    // return true;
  }
  // return true;
});
