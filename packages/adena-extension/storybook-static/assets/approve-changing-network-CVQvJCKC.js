import{m as n,j as e}from"./global-style-Be4sOX77.js";import{T as w}from"./index-Ct-w3XHB.js";import"./index-CLRA8FOO.js";import"./index-DrT1707K.js";import"./index-DjFTnIrN.js";import"./index-DacC881Y.js";import"./index-BxhAeZbh.js";import{S as x}from"./index-CulhM7-u.js";import"./index-CpLq81TF.js";import"./index-Bv2zqv-E.js";import"./index-g6zNktBg.js";import"./index-B3tmVslE.js";import"./index-C6Pb5J-W.js";import"./index-C0j4FPrl.js";import"./index-jlviZXHb.js";import{g as f}from"./index-Dfwxv35r.js";import"./index-gWriterE.js";import"./index-BPXqDXY6.js";import"./index-VyJW6yi1.js";import"./index-BKC22mc2.js";import"./index-FLo-pS1C.js";import"./index-BcayXZGa.js";import{d as v,r as t,n as y}from"./theme-D2qI5cuM.js";import{A as m}from"./approve-changing-network-item-BvMvg3sH.js";const k="data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%20width='24'%20height='24'%20viewBox='0%200%2024%2024'%20fill='none'%3e%3cpath%20d='M8%2020L17%2012L8%204'%20stroke='white'%20stroke-width='2'%20stroke-linecap='round'%20stroke-linejoin='round'/%3e%3c/svg%3e",j=v.div`
  ${n.flex()};
  width: 100%;
  height: auto;
  justify-content: center;
  align-items: center;
  padding: 24px 20px;

  .title-container {
    ${n.flex({align:"normal",justify:"normal"})};
    width: 100%;
    height: 152px;
    margin-bottom: 16px;

    h4 {
      display: block;
      max-width: 100%;
      text-align: center;
      text-overflow: ellipsis;
      overflow: hidden;
      white-space: nowrap;
      word-break: break-all;
    }

    .description-wrapper {
      display: flex;
      width: 100%;
      margin: 12px auto 0 auto;
      justify-content: center;
    }
  }

  .info-wrapper {
    ${n.flex({direction:"row",align:"flex-start",justify:"normal"})};
    width: fit-content;

    .icon-arrow {
      width: 24px;
      height: 24px;
      margin: 28px;
    }
  }
`,C=({fromChain:c,toChain:r,changeable:i,processing:d,done:o,changeNetwork:a,cancel:s,onResponse:p})=>{const u=t.useMemo(()=>`Switch to ${r.name}`,[r.name]),l=y(),g=t.useCallback(()=>{s()},[s]),h=t.useCallback(()=>{i&&a()},[i,a]);return t.useEffect(()=>{o&&p()},[o,p]),e.jsxs(j,{children:[e.jsxs("div",{className:"title-container",children:[e.jsx(x,{title:u}),e.jsx("div",{className:"description-wrapper",children:e.jsx(w,{type:"body1Reg",color:l.neutral.a,textAlign:"center",children:`This will switch the current network on
Adena to the one that matches the
connected dapp.`})})]}),e.jsxs("div",{className:"info-wrapper",children:[e.jsx(m,{...c}),e.jsx("img",{className:"icon-arrow",src:k,alt:"arrow"}),e.jsx(m,{...r})]}),e.jsx(f,{leftButton:{text:"Cancel",onClick:g},rightButton:{primary:!0,loading:d,disabled:i===!1,text:"Switch",onClick:h}})]})};C.__docgenInfo={description:"",methods:[],displayName:"ApproveChangingNetwork",props:{fromChain:{required:!0,tsType:{name:"ChangingNetworkInfo"},description:""},toChain:{required:!0,tsType:{name:"ChangingNetworkInfo"},description:""},changeable:{required:!0,tsType:{name:"boolean"},description:""},processing:{required:!0,tsType:{name:"boolean"},description:""},done:{required:!0,tsType:{name:"boolean"},description:""},changeNetwork:{required:!0,tsType:{name:"signature",type:"function",raw:"() => void",signature:{arguments:[],return:{name:"void"}}},description:""},cancel:{required:!0,tsType:{name:"signature",type:"function",raw:"() => void",signature:{arguments:[],return:{name:"void"}}},description:""},onResponse:{required:!0,tsType:{name:"signature",type:"function",raw:"() => void",signature:{arguments:[],return:{name:"void"}}},description:""},onTimeout:{required:!0,tsType:{name:"signature",type:"function",raw:"() => void",signature:{arguments:[],return:{name:"void"}}},description:""}}};export{C as A};
