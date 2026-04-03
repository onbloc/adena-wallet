import{m as u,j as e}from"./global-style-Be4sOX77.js";import{U as l}from"./common-unknown-logo-D3UstGT7.js";import{W as g}from"./index-Ct-w3XHB.js";import"./index-CLRA8FOO.js";import"./index-DrT1707K.js";import"./index-DjFTnIrN.js";import"./index-DacC881Y.js";import"./index-BxhAeZbh.js";import{S as c}from"./index-CulhM7-u.js";import"./index-CpLq81TF.js";import"./index-Bv2zqv-E.js";import"./index-g6zNktBg.js";import"./index-B3tmVslE.js";import"./index-C6Pb5J-W.js";import"./index-C0j4FPrl.js";import"./index-jlviZXHb.js";import{g as x}from"./index-Dfwxv35r.js";import"./index-gWriterE.js";import"./index-BPXqDXY6.js";import"./index-VyJW6yi1.js";import"./index-BKC22mc2.js";import"./index-FLo-pS1C.js";import"./index-BcayXZGa.js";import{d as f,r as o}from"./theme-D2qI5cuM.js";import{A as v}from"./approve-adding-network-table-C7xJsNmY.js";const w=f.div`
  ${u.flex({align:"normal",justify:"normal"})};
  width: 100%;
  height: auto;
  padding: 24px 20px 120px 20px;
  overflow: auto;

  h4 {
    display: block;
    text-align: right;
    white-space: nowrap;
    text-overflow: ellipsis;
    overflow: hidden;
  }

  .logo-wrapper {
    display: flex;
    width: 100%;
    margin: 24px auto;
    justify-content: center;
    align-items: center;

    & img {
      width: 80px;
      height: 80px;
    }
  }

  .table-wrapper {
    display: flex;
    width: 100%;
    margin-top: 15px;
  }
`,y=({networkInfo:r,logo:p,approvable:n,processing:a,done:t,cancel:s,approve:d,onResponse:i})=>{const m=o.useMemo(()=>`Add ${r.name}`,[r.name]);return o.useEffect(()=>{t&&i()},[t,i]),e.jsxs(w,{children:[e.jsx(c,{title:m}),e.jsx("div",{className:"logo-wrapper",children:e.jsx("img",{src:p||l,alt:"logo"})}),e.jsx(g,{padding:"10px 18px",type:"addingNetwork"}),e.jsx("div",{className:"table-wrapper",children:e.jsx(v,{name:r.name,rpcUrl:r.rpcUrl,chainId:r.chainId})}),e.jsx(x,{filled:!0,leftButton:{text:"Cancel",onClick:s},rightButton:{primary:!0,loading:a,disabled:n===!1,text:"Approve",onClick:d}})]})};y.__docgenInfo={description:"",methods:[],displayName:"ApproveAddingNetwork",props:{networkInfo:{required:!0,tsType:{name:"AddingNetworkInfo"},description:""},logo:{required:!1,tsType:{name:"string"},description:""},approvable:{required:!0,tsType:{name:"boolean"},description:""},processing:{required:!0,tsType:{name:"boolean"},description:""},done:{required:!0,tsType:{name:"boolean"},description:""},cancel:{required:!0,tsType:{name:"signature",type:"function",raw:"() => void",signature:{arguments:[],return:{name:"void"}}},description:""},approve:{required:!0,tsType:{name:"signature",type:"function",raw:"() => void",signature:{arguments:[],return:{name:"void"}}},description:""},onResponse:{required:!0,tsType:{name:"signature",type:"function",raw:"() => void",signature:{arguments:[],return:{name:"void"}}},description:""},onTimeout:{required:!0,tsType:{name:"signature",type:"function",raw:"() => void",signature:{arguments:[],return:{name:"void"}}},description:""}}};export{y as A};
