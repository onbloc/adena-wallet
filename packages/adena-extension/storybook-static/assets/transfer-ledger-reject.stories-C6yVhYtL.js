import{i as e}from"./_polyfill-node.global-CL4hvcq6.js";import{_ as t,c as n,g as r,rt as i,s as a,t as o}from"./iframe-DekVl-_p.js";import{_ as s,h as c,t as l}from"./atoms-DPNcwsZr.js";import{C as u,f as d,r as f,w as p}from"./approve-ledger-loading-BquluU52.js";var m,h=e((()=>{a(),t(),m=r.div`
  ${n.flex({align:`normal`,justify:`flex-start`})};
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 444px;

  .reject-icon {
    width: 100px;
    height: 100px;
    margin: 20px auto;
  }

  div {
    text-align: center;
  }

  .close-button {
    position: absolute;
    bottom: 0;
  }
`})),g,_,v,y=e((()=>{p(),l(),f(),i(),h(),g=o(),_={title:`Transaction Rejected`,desc:`The transaction has been rejected on
your ledger device. Please approve the
transaction in your wallet to complete
the transaction.`},v=({onClickClose:e})=>(0,g.jsxs)(m,{children:[(0,g.jsx)(`img`,{className:`reject-icon`,src:u,alt:`logo-image`}),(0,g.jsx)(d,{title:_.title,desc:_.desc}),(0,g.jsx)(s,{fullWidth:!0,hierarchy:`dark`,className:`close-button`,margin:`0px auto`,onClick:e,children:(0,g.jsx)(c,{type:`body1Bold`,children:`Close`})})]}),v.__docgenInfo={description:``,methods:[],displayName:`TransferLedgerReject`,props:{onClickClose:{required:!0,tsType:{name:`signature`,type:`function`,raw:`() => void`,signature:{arguments:[],return:{name:`void`}}},description:``}}}})),b,x,S,C;e((()=>{y(),{action:b}=__STORYBOOK_MODULE_ACTIONS__,x={title:`components/transfer/TransferLedgerReject`,component:v},S={args:{onClickClose:b(`click close`)}},S.parameters={...S.parameters,docs:{...S.parameters?.docs,source:{originalSource:`{
  args: {
    onClickClose: action('click close')
  }
}`,...S.parameters?.docs?.source}}},C=[`Default`]}))();export{S as Default,C as __namedExportsOrder,x as default};