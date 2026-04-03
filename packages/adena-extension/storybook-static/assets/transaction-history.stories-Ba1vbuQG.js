import{i as e}from"./_polyfill-node.global-CL4hvcq6.js";import{a as t,i as n}from"./approve-ledger-loading-BquluU52.js";var r,i,a,o,s,c,l,u,d,f;e((()=>{t(),{action:r}=__STORYBOOK_MODULE_ACTIONS__,i={title:`components/transaction-history/TransactionHistory`,component:n},a={hash:`transferRSendSuccessInfoHash`,logo:`https://raw.githubusercontent.com/onbloc/gno-token-resource/main/gno-native/images/gnot.svg`,type:`TRANSFER`,status:`SUCCESS`,title:`Send`,description:`To: g1n5...123n`,extraInfo:``,amount:{value:`-4,000.23`,denom:`GNOT`},valueType:`DEFAULT`,date:`2023-04-24 07:05:16`},o={hash:`transferReceiveSuccessInfoHash`,logo:`https://raw.githubusercontent.com/onbloc/gno-token-resource/main/gno-native/images/gnot.svg`,type:`TRANSFER`,status:`SUCCESS`,title:`Receive`,description:`To: g1n5...123n`,extraInfo:``,amount:{value:`+4,000`,denom:`GNOT`},valueType:`ACTIVE`,date:`2023-04-24 07:05:16`},s={hash:`transferRSendFailedInfoHash`,logo:`https://raw.githubusercontent.com/onbloc/gno-token-resource/main/gno-native/images/gnot.svg`,type:`TRANSFER`,status:`FAIL`,title:`Failed`,description:`To: g1n5...123n`,extraInfo:``,amount:{value:`-4,000.23`,denom:`GNOT`},valueType:`BLUR`,date:`2023-04-24 07:05:16`},c={hash:`contractSuccessInfoHash`,logo:``,type:`CONTRACT_CALL`,status:`SUCCESS`,title:`CreateThread`,extraInfo:``,amount:{value:`-4,000.23`,denom:`GNOT`},valueType:`DEFAULT`,date:`2023-04-24 07:05:16`},l={hash:`multiContractSuccessInfoHash`,logo:``,type:`MULTI_CONTRACT_CALL`,status:`SUCCESS`,title:`CreateThread`,extraInfo:`+2`,amount:{value:`-4,000.23`,denom:`GNOT`},valueType:`DEFAULT`,date:`2023-04-24 07:05:16`},u={hash:`addPackageSuccessInfoHash`,logo:``,type:`ADD_PACKAGE`,status:`SUCCESS`,title:`AddPkg`,amount:{value:`-4,000.23`,denom:`GNOT`},valueType:`DEFAULT`,date:`2023-04-24 07:05:16`},d={args:{status:`success`,transactionInfoLists:[{title:`Today`,transactions:[a,o,s]},{title:`Yesterday`,transactions:[c,l,u]},{title:`Apr 19, 2023`,transactions:[c,l,u]}],onClickItem:r(`click item`)}},d.parameters={...d.parameters,docs:{...d.parameters?.docs,source:{originalSource:`{
  args: {
    status: 'success',
    transactionInfoLists: [{
      title: 'Today',
      transactions: [transferRSendSuccessInfo, transferReceiveSuccessInfo, transferRSendFailedInfo]
    }, {
      title: 'Yesterday',
      transactions: [contractSuccessInfo, multiContractSuccessInfo, addPackageSuccessInfo]
    }, {
      title: 'Apr 19, 2023',
      transactions: [contractSuccessInfo, multiContractSuccessInfo, addPackageSuccessInfo]
    }],
    onClickItem: action('click item')
  }
}`,...d.parameters?.docs?.source}}},f=[`Default`]}))();export{d as Default,f as __namedExportsOrder,i as default};