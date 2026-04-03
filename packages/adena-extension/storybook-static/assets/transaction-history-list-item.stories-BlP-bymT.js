import{n as e}from"./chunk-zsgVPwQN.js";import{c as t,l as n}from"./approve-ledger-loading-BtJ73zaA.js";var r,i,a,o,s,c,l,u,d,f;e((()=>{n(),{action:r}=__STORYBOOK_MODULE_ACTIONS__,i={title:`components/transaction-history/TransactionHistoryListItem`,component:t},a={args:{hash:`hash1`,logo:`https://raw.githubusercontent.com/onbloc/gno-token-resource/main/gno-native/images/gnot.svg`,type:`TRANSFER`,status:`SUCCESS`,title:`Send`,description:`To: g1n5...123n`,extraInfo:``,amount:{value:`-4,000`,denom:`GNOT`},valueType:`DEFAULT`,onClickItem:r(`click item`)}},o={args:{hash:`transferSendSuccessInfoHash`,logo:`https://raw.githubusercontent.com/onbloc/gno-token-resource/main/gno-native/images/gnot.svg`,type:`TRANSFER`,status:`SUCCESS`,title:`Send`,description:`To: g1n5...123n`,extraInfo:``,amount:{value:`-4,000.23`,denom:`GNOT`},valueType:`DEFAULT`,onClickItem:r(`click item`)}},s={args:{hash:`transferReceiveSuccessInfoHash`,logo:`https://raw.githubusercontent.com/onbloc/gno-token-resource/main/gno-native/images/gnot.svg`,type:`TRANSFER`,status:`SUCCESS`,title:`Receive`,description:`To: g1n5...123n`,extraInfo:``,amount:{value:`+4,000`,denom:`GNOT`},valueType:`ACTIVE`,onClickItem:r(`click item`)}},c={args:{hash:`transferSendFailedInfoHash`,logo:`https://raw.githubusercontent.com/onbloc/gno-token-resource/main/gno-native/images/gnot.svg`,type:`TRANSFER`,status:`FAIL`,title:`Failed`,description:`To: g1n5...123n`,extraInfo:``,amount:{value:`-4,000.23`,denom:`GNOT`},valueType:`BLUR`,onClickItem:r(`click item`)}},l={args:{hash:`contractSuccessInfoHash`,logo:``,type:`CONTRACT_CALL`,status:`SUCCESS`,title:`CreateThread`,extraInfo:``,amount:{value:`-4,000.23`,denom:`GNOT`},valueType:`DEFAULT`,onClickItem:r(`click item`)}},u={args:{hash:`multiContractSuccessInfoHash`,logo:``,type:`MULTI_CONTRACT_CALL`,status:`SUCCESS`,title:`CreateThread`,extraInfo:`+2`,amount:{value:`-4,000.23`,denom:`GNOT`},valueType:`DEFAULT`,onClickItem:r(`click item`)}},d={args:{hash:`addPackageSuccessInfoHash`,logo:``,type:`ADD_PACKAGE`,status:`SUCCESS`,title:`AddPkg`,amount:{value:`-4,000.23`,denom:`GNOT`},valueType:`DEFAULT`,onClickItem:r(`click item`)}},a.parameters={...a.parameters,docs:{...a.parameters?.docs,source:{originalSource:`{
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
}`,...a.parameters?.docs?.source}}},o.parameters={...o.parameters,docs:{...o.parameters?.docs,source:{originalSource:`{
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
}`,...o.parameters?.docs?.source}}},s.parameters={...s.parameters,docs:{...s.parameters?.docs,source:{originalSource:`{
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
}`,...s.parameters?.docs?.source}}},c.parameters={...c.parameters,docs:{...c.parameters?.docs,source:{originalSource:`{
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
}`,...c.parameters?.docs?.source}}},l.parameters={...l.parameters,docs:{...l.parameters?.docs,source:{originalSource:`{
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
}`,...l.parameters?.docs?.source}}},u.parameters={...u.parameters,docs:{...u.parameters?.docs,source:{originalSource:`{
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
}`,...u.parameters?.docs?.source}}},d.parameters={...d.parameters,docs:{...d.parameters?.docs,source:{originalSource:`{
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
}`,...d.parameters?.docs?.source}}},f=[`Default`,`TransferSendSuccess`,`TransferReceiveSuccess`,`TransferSendFailed`,`ContractSuccess`,`MultiContractSuccess`,`AddPackageSuccess`]}))();export{d as AddPackageSuccess,l as ContractSuccess,a as Default,u as MultiContractSuccess,s as TransferReceiveSuccess,c as TransferSendFailed,o as TransferSendSuccess,f as __namedExportsOrder,i as default};