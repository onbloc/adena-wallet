import{m as r,j as t}from"./global-style-Be4sOX77.js";import{I as o,h as n}from"./index-Dfwxv35r.js";import{B as s,T as a}from"./index-Ct-w3XHB.js";import"./index-CLRA8FOO.js";import"./index-DrT1707K.js";import"./index-DjFTnIrN.js";import"./index-DacC881Y.js";import"./index-BxhAeZbh.js";import"./index-CulhM7-u.js";import"./index-CpLq81TF.js";import"./index-Bv2zqv-E.js";import"./index-g6zNktBg.js";import"./index-B3tmVslE.js";import"./index-C6Pb5J-W.js";import"./index-C0j4FPrl.js";import"./index-jlviZXHb.js";import"./index-gWriterE.js";import"./index-BPXqDXY6.js";import"./index-VyJW6yi1.js";import"./index-BKC22mc2.js";import"./index-FLo-pS1C.js";import"./index-BcayXZGa.js";import{d as m}from"./theme-D2qI5cuM.js";const p=m.div`
  ${r.flex({align:"normal",justify:"flex-start"})};
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
`,e={title:"Transaction Rejected",desc:`The transaction has been rejected on
your ledger device. Please approve the
transaction in your wallet to complete
the transaction.`},c=({onClickClose:i})=>t.jsxs(p,{children:[t.jsx("img",{className:"reject-icon",src:o,alt:"logo-image"}),t.jsx(n,{title:e.title,desc:e.desc}),t.jsx(s,{fullWidth:!0,hierarchy:"dark",className:"close-button",margin:"0px auto",onClick:i,children:t.jsx(a,{type:"body1Bold",children:"Close"})})]});c.__docgenInfo={description:"",methods:[],displayName:"TransferLedgerReject",props:{onClickClose:{required:!0,tsType:{name:"signature",type:"function",raw:"() => void",signature:{arguments:[],return:{name:"void"}}},description:""}}};export{c as T};
