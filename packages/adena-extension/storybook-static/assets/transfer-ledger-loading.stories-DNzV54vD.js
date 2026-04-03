import{c as e,i as t}from"./_polyfill-node.global-CL4hvcq6.js";import{_ as n,c as r,g as i,rt as a,s as o,t as s}from"./iframe-DekVl-_p.js";import{d as c,t as l}from"./atoms-DPNcwsZr.js";import{D as u,O as d,f,g as p,r as m}from"./approve-ledger-loading-BquluU52.js";var h,g=t((()=>{o(),n(),h=i.div`
  ${r.flex({align:`normal`,justify:`flex-start`})};
  position: relative;
  width: 100%;
  height: auto;
  padding-bottom: 120px;

  @keyframes rotate {
    from {
      -webkit-transform: rotate(0deg);
      -o-transform: rotate(0deg);
      transform: rotate(0deg);
    }
    to {
      -webkit-transform: rotate(360deg);
      -o-transform: rotate(360deg);
      transform: rotate(360deg);
    }
  }

  .icon {
    display: flex;
    flex-shrink: 0;
    width: 100px;
    height: 100px;
    margin: 20px auto;
    animation: rotate 1.5s infinite;
  }

  div {
    text-align: center;
  }

  .data-wrapper {
    ${r.flex({justify:`flex-start`})};
    width: 100%;
    margin-top: 20px;
  }
`})),_,v,y,b,x=t((()=>{l(),d(),m(),_=e(a()),g(),v=s(),y={title:`Requesting Approval
on Hardware Wallet`,desc:`Please approve this transaction on your
ledger device to proceed.`},b=({document:e,onClickCancel:t})=>{let n=(0,_.useMemo)(()=>{if(!e)return null;let t=e.fee.amount[0]?`${e.fee.amount[0]?.amount}${e.fee.amount[0]?.denom}`:``;return[{key:`Chain ID`,value:e.chain_id},{key:`Account`,value:e.account_number},{key:`Sequence`,value:e.sequence},{key:`Gas Fee`,value:t},{key:`Gas Wanted`,value:e.fee.gas}]},[e]);return(0,v.jsxs)(h,{children:[(0,v.jsx)(c,{name:`iconConnectLoading`,className:`icon`}),(0,v.jsx)(f,{title:y.title,desc:y.desc}),n&&(0,v.jsx)(`div`,{className:`data-wrapper`,children:(0,v.jsx)(u,{data:n})}),(0,v.jsx)(p,{text:`Cancel`,onClick:t})]})},b.__docgenInfo={description:``,methods:[],displayName:`TransferLedgerLoading`,props:{document:{required:!0,tsType:{name:`union`,raw:`Document | null`,elements:[{name:`Document`},{name:`null`}]},description:``},onClickCancel:{required:!0,tsType:{name:`signature`,type:`function`,raw:`() => void`,signature:{arguments:[],return:{name:`void`}}},description:``}}}})),S,C,w,T;t((()=>{x(),{action:S}=__STORYBOOK_MODULE_ACTIONS__,C={title:`components/transfer/TransferLedgerLoading`,component:b},w={args:{document:{msgs:[],fee:{amount:[{amount:`1`,denom:`ugnot`}],gas:`5000000`},chain_id:`dev`,memo:``,account_number:`0`,sequence:`1`},onClickCancel:S(`click cancel`)}},w.parameters={...w.parameters,docs:{...w.parameters?.docs,source:{originalSource:`{
  args: {
    document: {
      msgs: [],
      fee: {
        amount: [{
          amount: '1',
          denom: 'ugnot'
        }],
        gas: '5000000'
      },
      chain_id: 'dev',
      memo: '',
      account_number: '0',
      sequence: '1'
    },
    onClickCancel: action('click cancel')
  }
}`,...w.parameters?.docs?.source}}},T=[`Default`]}))();export{w as Default,T as __namedExportsOrder,C as default};