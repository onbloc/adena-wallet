import{i as e}from"./_polyfill-node.global-CL4hvcq6.js";import{_ as t,v as n}from"./approve-ledger-loading-BquluU52.js";var r,i,a,o;e((()=>{n(),{action:r}=__STORYBOOK_MODULE_ACTIONS__,i={title:`components/approve/ApproveTransaction`,component:t},a={args:{domain:``,loading:!0,logo:``,title:`Sign Transaction`,contracts:[{type:`/vm.m_call`,function:`GetBoardIDFromName`,value:``}],networkFee:{amount:`0.0048`,denom:`GNOT`},transactionData:``,opened:!1,onToggleTransactionData:r(`openTransactionData`),onClickConfirm:r(`confirm`),onClickCancel:r(`cancel`)}},a.parameters={...a.parameters,docs:{...a.parameters?.docs,source:{originalSource:`{
  args: {
    domain: '',
    loading: true,
    logo: '',
    title: 'Sign Transaction',
    contracts: [{
      type: '/vm.m_call',
      function: 'GetBoardIDFromName',
      value: ''
    }],
    networkFee: {
      amount: '0.0048',
      denom: 'GNOT'
    },
    transactionData: '',
    opened: false,
    onToggleTransactionData: action('openTransactionData'),
    onClickConfirm: action('confirm'),
    onClickCancel: action('cancel')
  }
}`,...a.parameters?.docs?.source}}},o=[`Default`]}))();export{a as Default,o as __namedExportsOrder,i as default};