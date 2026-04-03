import{c as e,i as t}from"./_polyfill-node.global-CL4hvcq6.js";import{_ as n,g as r,i,n as a,r as o,rt as s,t as c}from"./iframe-DekVl-_p.js";var l,u=t((()=>{i(),n(),l=r.div`
  display: flex;
  flex-wrap: wrap;
  width: 100%;
  height: auto;
  padding: 20px;
  gap: 12px;
  ${a.body2Reg};
  background-color: ${o(`neutral`,`_9`)};
  border-radius: 18px;

  .address-wrapper {
    display: flex;
    width: 100%;
    height: auto;
    word-break: break-all;
    overflow: hidden;
  }

  .memo-wrapper {
    display: block;
    width: 100%;
    height: auto;
    color: ${o(`neutral`,`a`)};
    word-break: break-all;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }
`})),d,f,p,m=t((()=>{d=e(s()),u(),f=c(),p=({toAddress:e,memo:t})=>{let n=(0,d.useMemo)(()=>{let e=`Memo:`;return t?`${e} ${t}`:`${e} (Empty)`},[t]);return(0,f.jsxs)(l,{children:[(0,f.jsx)(`div`,{className:`address-wrapper`,children:e}),(0,f.jsx)(`div`,{className:`memo-wrapper`,children:n})]})},p.__docgenInfo={description:``,methods:[],displayName:`TransferSummaryAddress`,props:{toAddress:{required:!0,tsType:{name:`string`},description:``},memo:{required:!0,tsType:{name:`string`},description:``}}}}));export{m as n,p as t};