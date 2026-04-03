import{T as i}from"./index-Dfwxv35r.js";import"./global-style-Be4sOX77.js";import"./theme-D2qI5cuM.js";import"./index-BAMY2Nnw.js";import"./index-Ct-w3XHB.js";import"./index-CulhM7-u.js";import"./index-CLRA8FOO.js";import"./index-DrT1707K.js";import"./index-DjFTnIrN.js";import"./index-DacC881Y.js";import"./bignumber-B1z4pYDt.js";import"./index-BxhAeZbh.js";import"./index-CpLq81TF.js";import"./index-B3tmVslE.js";import"./index-jlviZXHb.js";import"./index-Bv2zqv-E.js";import"./index-g6zNktBg.js";import"./index-C6Pb5J-W.js";import"./index-C0j4FPrl.js";import"./client-utils-zr3RfGzN.js";import"./index-y5y07clE.js";import"./gte-LYzHDOB4.js";import"./index-gWriterE.js";import"./index-BPXqDXY6.js";import"./common-unknown-logo-D3UstGT7.js";import"./info-tooltip-DLlSKEy5.js";import"./wallet-BURXSrHk.js";import"./index-VyJW6yi1.js";import"./index-BKC22mc2.js";import"./index-FLo-pS1C.js";import"./encoding-util-0q6lHXNs.js";import"./index-BcayXZGa.js";import"./index-DuHfkOKV.js";import"./index-CgTU6P2S.js";import"./lodash-BU2fF3dy.js";import"./network-fee-custom-input-pot4XkOO.js";import"./token.constant-C-ogqcde.js";import"./index-B5E4NBgv.js";import"./common-arrow-up-gray-kFpYaQkk.js";import"./icon-link-BfCCJL0P.js";import"./string-utils-Bff5ZSZ1.js";const{action:e}=__STORYBOOK_MODULE_ACTIONS__,W={title:"components/transaction-history/TransactionHistoryListItem",component:i},n={args:{hash:"hash1",logo:"https://raw.githubusercontent.com/onbloc/gno-token-resource/main/gno-native/images/gnot.svg",type:"TRANSFER",status:"SUCCESS",title:"Send",description:"To: g1n5...123n",extraInfo:"",amount:{value:"-4,000",denom:"GNOT"},valueType:"DEFAULT",onClickItem:e("click item")}},t={args:{hash:"transferSendSuccessInfoHash",logo:"https://raw.githubusercontent.com/onbloc/gno-token-resource/main/gno-native/images/gnot.svg",type:"TRANSFER",status:"SUCCESS",title:"Send",description:"To: g1n5...123n",extraInfo:"",amount:{value:"-4,000.23",denom:"GNOT"},valueType:"DEFAULT",onClickItem:e("click item")}},o={args:{hash:"transferReceiveSuccessInfoHash",logo:"https://raw.githubusercontent.com/onbloc/gno-token-resource/main/gno-native/images/gnot.svg",type:"TRANSFER",status:"SUCCESS",title:"Receive",description:"To: g1n5...123n",extraInfo:"",amount:{value:"+4,000",denom:"GNOT"},valueType:"ACTIVE",onClickItem:e("click item")}},a={args:{hash:"transferSendFailedInfoHash",logo:"https://raw.githubusercontent.com/onbloc/gno-token-resource/main/gno-native/images/gnot.svg",type:"TRANSFER",status:"FAIL",title:"Failed",description:"To: g1n5...123n",extraInfo:"",amount:{value:"-4,000.23",denom:"GNOT"},valueType:"BLUR",onClickItem:e("click item")}},s={args:{hash:"contractSuccessInfoHash",logo:"",type:"CONTRACT_CALL",status:"SUCCESS",title:"CreateThread",extraInfo:"",amount:{value:"-4,000.23",denom:"GNOT"},valueType:"DEFAULT",onClickItem:e("click item")}},r={args:{hash:"multiContractSuccessInfoHash",logo:"",type:"MULTI_CONTRACT_CALL",status:"SUCCESS",title:"CreateThread",extraInfo:"+2",amount:{value:"-4,000.23",denom:"GNOT"},valueType:"DEFAULT",onClickItem:e("click item")}},c={args:{hash:"addPackageSuccessInfoHash",logo:"",type:"ADD_PACKAGE",status:"SUCCESS",title:"AddPkg",amount:{value:"-4,000.23",denom:"GNOT"},valueType:"DEFAULT",onClickItem:e("click item")}};n.parameters={...n.parameters,docs:{...n.parameters?.docs,source:{originalSource:`{
  args: {
    hash: 'hash1',
    logo: 'https://raw.githubusercontent.com/onbloc/gno-token-resource/main/gno-native/images/gnot.svg',
    type: 'TRANSFER',
    status: 'SUCCESS',
    title: 'Send',
    description: 'To: g1n5...123n',
    extraInfo: '',
    amount: {
      value: '-4,000',
      denom: 'GNOT'
    },
    valueType: 'DEFAULT',
    onClickItem: action('click item')
  }
}`,...n.parameters?.docs?.source}}};t.parameters={...t.parameters,docs:{...t.parameters?.docs,source:{originalSource:`{
  args: {
    hash: 'transferSendSuccessInfoHash',
    logo: 'https://raw.githubusercontent.com/onbloc/gno-token-resource/main/gno-native/images/gnot.svg',
    type: 'TRANSFER',
    status: 'SUCCESS',
    title: 'Send',
    description: 'To: g1n5...123n',
    extraInfo: '',
    amount: {
      value: '-4,000.23',
      denom: 'GNOT'
    },
    valueType: 'DEFAULT',
    onClickItem: action('click item')
  }
}`,...t.parameters?.docs?.source}}};o.parameters={...o.parameters,docs:{...o.parameters?.docs,source:{originalSource:`{
  args: {
    hash: 'transferReceiveSuccessInfoHash',
    logo: 'https://raw.githubusercontent.com/onbloc/gno-token-resource/main/gno-native/images/gnot.svg',
    type: 'TRANSFER',
    status: 'SUCCESS',
    title: 'Receive',
    description: 'To: g1n5...123n',
    extraInfo: '',
    amount: {
      value: '+4,000',
      denom: 'GNOT'
    },
    valueType: 'ACTIVE',
    onClickItem: action('click item')
  }
}`,...o.parameters?.docs?.source}}};a.parameters={...a.parameters,docs:{...a.parameters?.docs,source:{originalSource:`{
  args: {
    hash: 'transferSendFailedInfoHash',
    logo: 'https://raw.githubusercontent.com/onbloc/gno-token-resource/main/gno-native/images/gnot.svg',
    type: 'TRANSFER',
    status: 'FAIL',
    title: 'Failed',
    description: 'To: g1n5...123n',
    extraInfo: '',
    amount: {
      value: '-4,000.23',
      denom: 'GNOT'
    },
    valueType: 'BLUR',
    onClickItem: action('click item')
  }
}`,...a.parameters?.docs?.source}}};s.parameters={...s.parameters,docs:{...s.parameters?.docs,source:{originalSource:`{
  args: {
    hash: 'contractSuccessInfoHash',
    logo: '',
    type: 'CONTRACT_CALL',
    status: 'SUCCESS',
    title: 'CreateThread',
    extraInfo: '',
    amount: {
      value: '-4,000.23',
      denom: 'GNOT'
    },
    valueType: 'DEFAULT',
    onClickItem: action('click item')
  }
}`,...s.parameters?.docs?.source}}};r.parameters={...r.parameters,docs:{...r.parameters?.docs,source:{originalSource:`{
  args: {
    hash: 'multiContractSuccessInfoHash',
    logo: '',
    type: 'MULTI_CONTRACT_CALL',
    status: 'SUCCESS',
    title: 'CreateThread',
    extraInfo: '+2',
    amount: {
      value: '-4,000.23',
      denom: 'GNOT'
    },
    valueType: 'DEFAULT',
    onClickItem: action('click item')
  }
}`,...r.parameters?.docs?.source}}};c.parameters={...c.parameters,docs:{...c.parameters?.docs,source:{originalSource:`{
  args: {
    hash: 'addPackageSuccessInfoHash',
    logo: '',
    type: 'ADD_PACKAGE',
    status: 'SUCCESS',
    title: 'AddPkg',
    amount: {
      value: '-4,000.23',
      denom: 'GNOT'
    },
    valueType: 'DEFAULT',
    onClickItem: action('click item')
  }
}`,...c.parameters?.docs?.source}}};const X=["Default","TransferSendSuccess","TransferReceiveSuccess","TransferSendFailed","ContractSuccess","MultiContractSuccess","AddPackageSuccess"];export{c as AddPackageSuccess,s as ContractSuccess,n as Default,r as MultiContractSuccess,o as TransferReceiveSuccess,a as TransferSendFailed,t as TransferSendSuccess,X as __namedExportsOrder,W as default};
