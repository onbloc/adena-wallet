import{m as a,j as e}from"./global-style-Be4sOX77.js";import{f as s,g as r,d as l}from"./theme-D2qI5cuM.js";const n=l.div`
  ${a.flex({align:"normal",justify:"normal"})};
  width: 100%;
  height: auto;
  border-radius: 18px;

  .table-row {
    ${a.flex({align:"normal",justify:"normal"})};
    padding: 8px 16px;
    background-color: ${r("neutral","_9")};
    margin-bottom: 2px;

    &:first-child {
      border-top-right-radius: 18px;
      border-top-left-radius: 18px;
    }

    &:last-child {
      border-bottom-right-radius: 18px;
      border-bottom-left-radius: 18px;
      margin-bottom: 0;
    }

    .title {
      ${s.body1Reg};
      color: ${r("neutral","a")};
      margin-bottom: 4px;
    }

    .value {
      ${s.body1Reg};
      color: ${r("neutral","_1")};
      word-break: break-all;
    }
  }
`,d=({name:t,rpcUrl:i,chainId:o})=>e.jsxs(n,{children:[e.jsxs("div",{className:"table-row",children:[e.jsx("span",{className:"title",children:"Name"}),e.jsx("span",{className:"value",children:t})]}),e.jsxs("div",{className:"table-row",children:[e.jsx("span",{className:"title",children:"RPC URL"}),e.jsx("span",{className:"value",children:i})]}),e.jsxs("div",{className:"table-row",children:[e.jsx("span",{className:"title",children:"Chain ID"}),e.jsx("span",{className:"value",children:o})]})]});d.__docgenInfo={description:"",methods:[],displayName:"ApproveAddingNetworkTable",props:{name:{required:!0,tsType:{name:"string"},description:""},rpcUrl:{required:!0,tsType:{name:"string"},description:""},chainId:{required:!0,tsType:{name:"string"},description:""}}};export{d as A};
