import{m as a,j as t}from"./global-style-Be4sOX77.js";import{I as s}from"./index-Ct-w3XHB.js";import"./index-CLRA8FOO.js";import"./index-DrT1707K.js";import"./index-DjFTnIrN.js";import"./index-DacC881Y.js";import"./index-BxhAeZbh.js";import"./index-CulhM7-u.js";import"./index-CpLq81TF.js";import"./index-Bv2zqv-E.js";import"./index-g6zNktBg.js";import"./index-B3tmVslE.js";import"./index-C6Pb5J-W.js";import"./index-C0j4FPrl.js";import"./index-jlviZXHb.js";import{h as m,D as p,i as d}from"./index-Dfwxv35r.js";import"./index-gWriterE.js";import"./index-BPXqDXY6.js";import"./index-VyJW6yi1.js";import"./index-BKC22mc2.js";import"./index-FLo-pS1C.js";import"./index-BcayXZGa.js";import{d as l,r as c}from"./theme-D2qI5cuM.js";const u=l.div`
  ${a.flex({align:"normal",justify:"flex-start"})};
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
    ${a.flex({justify:"flex-start"})};
    width: 100%;
    margin-top: 20px;
  }
`,o={title:`Requesting Approval
on Hardware Wallet`,desc:`Please approve this transaction on your
ledger device to proceed.`},f=({document:e,onClickCancel:i})=>{const r=c.useMemo(()=>{if(!e)return null;const n=e.fee.amount[0]?`${e.fee.amount[0]?.amount}${e.fee.amount[0]?.denom}`:"";return[{key:"Chain ID",value:e.chain_id},{key:"Account",value:e.account_number},{key:"Sequence",value:e.sequence},{key:"Gas Fee",value:n},{key:"Gas Wanted",value:e.fee.gas}]},[e]);return t.jsxs(u,{children:[t.jsx(s,{name:"iconConnectLoading",className:"icon"}),t.jsx(m,{title:o.title,desc:o.desc}),r&&t.jsx("div",{className:"data-wrapper",children:t.jsx(p,{data:r})}),t.jsx(d,{text:"Cancel",onClick:i})]})};f.__docgenInfo={description:"",methods:[],displayName:"TransferLedgerLoading",props:{document:{required:!0,tsType:{name:"union",raw:"Document | null",elements:[{name:"Document"},{name:"null"}]},description:""},onClickCancel:{required:!0,tsType:{name:"signature",type:"function",raw:"() => void",signature:{arguments:[],return:{name:"void"}}},description:""}}};export{f as T};
