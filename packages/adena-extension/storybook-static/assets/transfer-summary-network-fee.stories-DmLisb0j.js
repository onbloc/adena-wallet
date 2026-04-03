import{i as e}from"./_polyfill-node.global-CL4hvcq6.js";import{_ as t,c as n,g as r,i,n as a,r as o,rt as s,s as c,t as l}from"./iframe-DekVl-_p.js";import{r as u}from"./approve-ledger-loading-BquluU52.js";import{t as d}from"./token-balance-DOMhhn0q.js";var f,p=e((()=>{c(),i(),t(),f=r.div`
  ${n.flex({direction:`row`,justify:`space-between`})};
  width: 100%;
  padding: 14px 16px;
  background-color: ${o(`neutral`,`_9`)};
  border: 1px solid ${o(`neutral`,`_7`)};
  border-radius: 30px;
  ${({isError:e,theme:t})=>e&&`border-color: ${t.red._5};`}

  .key {
    color: ${o(`neutral`,`a`)};
    ${a.body2Reg};
  }
`})),m,h,g=e((()=>{u(),s(),p(),m=l(),h=({isError:e,value:t,denom:n})=>(0,m.jsxs)(f,{isError:e,children:[(0,m.jsx)(`span`,{className:`key`,children:`Network Fee`}),(0,m.jsx)(d,{value:t,denom:n,fontStyleKey:`body2Reg`,minimumFontSize:`11px`,orientation:`HORIZONTAL`})]}),h.__docgenInfo={description:``,methods:[],displayName:`TransferSummaryNetworkFee`,props:{isError:{required:!1,tsType:{name:`boolean`},description:``},value:{required:!0,tsType:{name:`string`},description:``},denom:{required:!0,tsType:{name:`string`},description:``}}}})),_,v,y;e((()=>{g(),_={title:`components/transfer/TransferSummaryNetworkFee`,component:h},v={args:{value:`0.0048`,denom:`GNOT`}},v.parameters={...v.parameters,docs:{...v.parameters?.docs,source:{originalSource:`{
  args: {
    value: '0.0048',
    denom: 'GNOT'
  }
}`,...v.parameters?.docs?.source}}},y=[`Default`]}))();export{v as Default,y as __namedExportsOrder,_ as default};