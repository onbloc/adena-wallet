import{j as e}from"./global-style-Be4sOX77.js";import{b as l}from"./chevron-left-BXSSadT9.js";import{f}from"./client-utils-zr3RfGzN.js";import"./index-Ct-w3XHB.js";import{P as y,R as s}from"./index-CLRA8FOO.js";import{C as g}from"./index-DrT1707K.js";import"./index-DjFTnIrN.js";import"./index-DacC881Y.js";import"./index-BxhAeZbh.js";import"./index-CulhM7-u.js";import"./index-CpLq81TF.js";import"./index-Bv2zqv-E.js";import"./index-g6zNktBg.js";import{W as k}from"./index-B3tmVslE.js";import"./index-C6Pb5J-W.js";import"./index-C0j4FPrl.js";import{W as c}from"./index-jlviZXHb.js";import{n as x,r as n,d as i}from"./theme-D2qI5cuM.js";import"./index-BAMY2Nnw.js";import"./index-y5y07clE.js";import"./gte-LYzHDOB4.js";import"./bignumber-B1z4pYDt.js";const b=i(s)`
  width: 100%;
  justify-content: space-between;
`,A=i(s)`
  gap: 8px;
`,h=i(s)`
  width: 24px;
`,m=({account:t,onClickGoBack:d})=>{const a=x(),[o,p]=n.useState(""),u=n.useMemo(()=>o===""?"":`(${f(o,4)})`,[o]);return n.useEffect(()=>{t&&t.getAddress("g").then(p)},[t]),e.jsxs(b,{children:[e.jsx(y,{onClick:d,style:{padding:4,backgroundColor:a.webInput._100,borderRadius:16},children:e.jsx(k,{src:l,size:24})}),t&&e.jsxs(A,{children:[e.jsx(c,{type:"title4",children:t.name}),e.jsx(c,{type:"body4",color:a.webNeutral._600,style:{lineHeight:"22px"},children:u}),e.jsx(g,{size:20,copyText:o})]}),e.jsx(h,{})]})};m.__docgenInfo={description:"",methods:[],displayName:"WebMainAccountHeader",props:{account:{required:!0,tsType:{name:"union",raw:"Account | null",elements:[{name:"Account"},{name:"null"}]},description:""},onClickGoBack:{required:!0,tsType:{name:"signature",type:"function",raw:"() => void",signature:{arguments:[],return:{name:"void"}}},description:""}}};const{action:_}=__STORYBOOK_MODULE_ACTIONS__,Y={title:"components/pages/WebMainAccountHeader",component:m},j={id:"id",index:1,type:"HD_WALLET",name:"name",keyringId:"keyringId",publicKey:[],toData:()=>({index:1,type:"HD_WALLET",name:"name",keyringId:"keyringId",publicKey:[]}),getAddress:async()=>"g1jg8mtutu9khhfwc4nxmuhcpftf0pajdhfvsqf5"},r={args:{account:j,onClickGoBack:_("click back")}};r.parameters={...r.parameters,docs:{...r.parameters?.docs,source:{originalSource:`{
  args: {
    account: mockAccount,
    onClickGoBack: action('click back')
  }
}`,...r.parameters?.docs?.source}}};const $=["Default"];export{r as Default,$ as __namedExportsOrder,Y as default};
