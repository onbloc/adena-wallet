import{i as e}from"./_polyfill-node.global-CL4hvcq6.js";import{_ as t,c as n,g as r,i,n as a,r as o,rt as s,s as c,t as l}from"./iframe-DekVl-_p.js";import{r as u}from"./approve-ledger-loading-BquluU52.js";import{t as d}from"./token-balance-DOMhhn0q.js";var f,p=e((()=>{c(),i(),t(),f=r.div`
  ${n.flex({direction:`row`,justify:`space-between`})};
  width: 100%;
  height: auto;
  padding: 20px;
  background-color: ${o(`neutral`,`_9`)};
  border-radius: 18px;

  .token-image {
    width: 30px;
    height: 30px;
  }

  .balance {
    display: contents;
    ${a.header5};
  }
`})),m,h,g=e((()=>{u(),s(),p(),m=l(),h=({tokenImage:e,value:t,denom:n})=>(0,m.jsxs)(f,{children:[(0,m.jsx)(`img`,{className:`token-image`,src:e,alt:`token image`}),(0,m.jsx)(`span`,{className:`balance`,children:(0,m.jsx)(d,{value:t,denom:n,fontStyleKey:`header5`,minimumFontSize:`16px`,orientation:`HORIZONTAL`})})]}),h.__docgenInfo={description:``,methods:[],displayName:`TransferSummaryBalance`,props:{tokenImage:{required:!0,tsType:{name:`string`},description:``},value:{required:!0,tsType:{name:`string`},description:``},denom:{required:!0,tsType:{name:`string`},description:``}}}}));export{g as n,h as t};