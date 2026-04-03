import{A as r}from"./address-input-RcD1gknS.js";import"./global-style-Be4sOX77.js";import"./theme-D2qI5cuM.js";import"./index-BAMY2Nnw.js";import"./address-book-list-DrpIOgat.js";import"./index-Ct-w3XHB.js";import"./index-CulhM7-u.js";import"./index-CLRA8FOO.js";import"./index-DrT1707K.js";import"./index-DjFTnIrN.js";import"./index-DacC881Y.js";import"./bignumber-B1z4pYDt.js";import"./index-BxhAeZbh.js";import"./index-CpLq81TF.js";import"./index-B3tmVslE.js";import"./index-jlviZXHb.js";import"./index-Bv2zqv-E.js";import"./index-g6zNktBg.js";import"./index-C6Pb5J-W.js";import"./index-C0j4FPrl.js";const{action:e}=__STORYBOOK_MODULE_ACTIONS__,v={title:"components/transfer/AddressInput",component:r},n=[{addressBookId:"1",description:"(g1uh...ohno)",name:"Account 1"},{addressBookId:"2",description:"(g1uh...ohno)",name:"Account 2"},{addressBookId:"3",description:"(g1uh...ohno)",name:"Account 3"},{addressBookId:"4",description:"(g1uh...ohno)",name:"Account 4"}],s={args:{opened:!1,hasError:!1,errorMessage:"Invalid address",selected:!1,selectedName:"Account 1",selectedDescription:"(g1ff...jpae)",address:"",addressBookInfos:n,onClickInputIcon:e("click input icon"),onChangeAddress:e("change address"),onClickAddressBook:e("click address book")}},o={args:{opened:!0,hasError:!1,errorMessage:"Invalid address",selected:!1,selectedName:void 0,selectedDescription:void 0,address:"",addressBookInfos:[],onClickInputIcon:e("click input icon"),onChangeAddress:e("change address"),onClickAddressBook:e("click address book")}};s.parameters={...s.parameters,docs:{...s.parameters?.docs,source:{originalSource:`{
  args: {
    opened: false,
    hasError: false,
    errorMessage: 'Invalid address',
    selected: false,
    selectedName: 'Account 1',
    selectedDescription: '(g1ff...jpae)',
    address: '',
    addressBookInfos,
    onClickInputIcon: action('click input icon'),
    onChangeAddress: action('change address'),
    onClickAddressBook: action('click address book')
  }
}`,...s.parameters?.docs?.source}}};o.parameters={...o.parameters,docs:{...o.parameters?.docs,source:{originalSource:`{
  args: {
    opened: true,
    hasError: false,
    errorMessage: 'Invalid address',
    selected: false,
    selectedName: undefined,
    selectedDescription: undefined,
    address: '',
    addressBookInfos: [],
    onClickInputIcon: action('click input icon'),
    onChangeAddress: action('change address'),
    onClickAddressBook: action('click address book')
  }
}`,...o.parameters?.docs?.source}}};const E=["Default","NoAddress"];export{s as Default,o as NoAddress,E as __namedExportsOrder,v as default};
