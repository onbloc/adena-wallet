import{m as i,j as e}from"./global-style-Be4sOX77.js";import{f as p,g as t,d as b,r}from"./theme-D2qI5cuM.js";const q=b.div`
  ${i.flex({align:"normal",justify:"normal"})};
  width: 100%;
  height: 100%;

  .input-wrapper {
    ${i.flex({align:"normal",justify:"normal"})};
    width: 100%;

    .input-box {
      ${i.flex({direction:"row",justify:"normal"})};
      width: 100%;
      min-height: 48px;
      padding: 12px 16px;
      ${p.body2Reg};
      background-color: ${t("neutral","_9")};
      border: 1px solid ${t("neutral","_7")};
      border-radius: 30px;
      margin-top: 12px;

      &:first-child {
        margin-top: 0;
      }

      input {
        display: flex;
        width: 100%;
        height: auto;
        resize: none;
        overflow: hidden;
        line-height: 25px;

        ::placeholder {
          color: ${t("neutral","a")};
        }

        &:read-only {
          color: ${t("neutral","a")};
        }
      }
    }
  }

  .error-message {
    position: relative;
    padding: 0 16px;
    ${p.captionReg};
    font-size: 13px;
    height: 14px;
    color: ${t("red","_5")};
  }
`,k=({name:u,rpcUrl:d,indexerUrl:c,chainId:m,rpcUrlError:s,indexerUrlError:o,chainIdError:l,editType:n,changeName:g,changeRPCUrl:h,changeIndexerUrl:x,changeChainId:y})=>{const f=r.useMemo(()=>n==="rpc-only",[n]),C=r.useMemo(()=>!1,[n]),v=r.useMemo(()=>n==="rpc-only",[n]),j=r.useMemo(()=>n==="rpc-only",[n]),w=r.useCallback(a=>{g(a.target.value)},[]),N=r.useCallback(a=>{h(a.target.value.replace(/ /g,""))},[]),I=r.useCallback(a=>{x(a.target.value.replace(/ /g,""))},[]),U=r.useCallback(a=>{y(a.target.value.replace(/ /g,""))},[]);return e.jsx(q,{children:e.jsxs("div",{className:"input-wrapper",children:[e.jsx("div",{className:"input-box",children:e.jsx("input",{type:"text",value:u,autoComplete:"off",onChange:w,placeholder:"Network Name",readOnly:f})}),e.jsx("div",{className:"input-box",children:e.jsx("input",{type:"text",value:d,autoComplete:"off",onChange:N,placeholder:"RPC URL",readOnly:C})}),s&&e.jsx("span",{className:"error-message",children:s}),e.jsx("div",{className:"input-box",children:e.jsx("input",{type:"text",value:m,autoComplete:"off",onChange:U,placeholder:"Chain ID",readOnly:v})}),l&&e.jsx("span",{className:"error-message",children:l}),e.jsx("div",{className:"input-box",children:e.jsx("input",{type:"text",value:c,autoComplete:"off",onChange:I,placeholder:"Indexer URL (Optional)",readOnly:j})}),o&&e.jsx("span",{className:"error-message",children:o})]})})};k.__docgenInfo={description:"",methods:[],displayName:"CustomNetworkInput",props:{name:{required:!0,tsType:{name:"string"},description:""},rpcUrl:{required:!0,tsType:{name:"string"},description:""},rpcUrlError:{required:!1,tsType:{name:"string"},description:""},indexerUrl:{required:!0,tsType:{name:"string"},description:""},indexerUrlError:{required:!1,tsType:{name:"string"},description:""},chainId:{required:!0,tsType:{name:"string"},description:""},chainIdError:{required:!1,tsType:{name:"string"},description:""},editType:{required:!1,tsType:{name:"union",raw:"'rpc-only' | 'all-default' | 'all'",elements:[{name:"literal",value:"'rpc-only'"},{name:"literal",value:"'all-default'"},{name:"literal",value:"'all'"}]},description:""},changeName:{required:!0,tsType:{name:"signature",type:"function",raw:"(name: string) => void",signature:{arguments:[{type:{name:"string"},name:"name"}],return:{name:"void"}}},description:""},changeRPCUrl:{required:!0,tsType:{name:"signature",type:"function",raw:"(rpcUrl: string) => void",signature:{arguments:[{type:{name:"string"},name:"rpcUrl"}],return:{name:"void"}}},description:""},changeIndexerUrl:{required:!0,tsType:{name:"signature",type:"function",raw:"(indexerUrl: string) => void",signature:{arguments:[{type:{name:"string"},name:"indexerUrl"}],return:{name:"void"}}},description:""},changeChainId:{required:!0,tsType:{name:"signature",type:"function",raw:"(chainId: string) => void",signature:{arguments:[{type:{name:"string"},name:"chainId"}],return:{name:"void"}}},description:""}}};export{k as C};
