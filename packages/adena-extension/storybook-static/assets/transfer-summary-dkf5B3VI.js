import{m as h,j as e}from"./global-style-Be4sOX77.js";import{S as y,a as T}from"./index-CulhM7-u.js";import{A as b}from"./transfer-arrow-down-BmHx-tM0.js";import"./index-Ct-w3XHB.js";import"./index-CLRA8FOO.js";import"./index-DrT1707K.js";import"./index-DjFTnIrN.js";import"./index-DacC881Y.js";import"./index-BxhAeZbh.js";import"./index-CpLq81TF.js";import"./index-Bv2zqv-E.js";import"./index-g6zNktBg.js";import"./index-B3tmVslE.js";import"./index-C6Pb5J-W.js";import"./index-C0j4FPrl.js";import"./index-jlviZXHb.js";import{N as k,B as v}from"./index-Dfwxv35r.js";import"./index-gWriterE.js";import"./index-BPXqDXY6.js";import"./index-VyJW6yi1.js";import"./index-BKC22mc2.js";import"./index-FLo-pS1C.js";import"./index-BcayXZGa.js";import{f as j,g as t,d as q,r as s}from"./theme-D2qI5cuM.js";import{T as S}from"./transfer-summary-address-D6c0zcQF.js";import{T as N}from"./transfer-summary-balance-D-WTHeR0.js";const B=q.div`
  ${h.flex({align:"normal",justify:"flex-start"})};
  position: relative;
  padding: 24px 20px 0;
  width: 100%;
  height: 100%;
  min-height: 444px;
  align-items: center;

  .sub-header-wrapper {
    width: 100%;
  }

  .info-wrapper {
    width: 100%;
    margin-top: 25px;
  }

  .direction-icon-wrapper {
    width: 100%;
    text-align: center;
    margin: 10px 0;
  }

  .network-fee-wrapper {
    width: 100%;
    margin-top: 20px;

    .error-message {
      position: relative;
      width: 100%;
      padding: 0 16px;
      ${j.captionReg};
      font-size: 13px;
      color: ${t("red","_5")};
    }
  }

  .simulate-error-banner {
    width: 100%;
    padding: 10px 16px;
    border-radius: 18px;
    background-color: rgba(239, 45, 33, 0.08);
    border: 1px solid ${t("red","_5")};
    margin-top: 8px;
    font-family: 'Poppins', sans-serif;
    font-weight: 500;
    font-size: 13px;
    line-height: 20px;
    color: ${t("red","_5")};
    word-break: break-word;
    overflow-wrap: break-word;

    .error-label {
      font-weight: 700;
    }
  }

  .bottom-spacer {
    width: 100%;
    height: 116px;
    flex-shrink: 0;
  }
`,C=({tokenMetainfo:m,tokenImage:p,transferBalance:o,toAddress:d,networkFee:n,memo:u,useNetworkFeeReturn:r,isErrorNetworkFee:i,simulateErrorBannerMessage:a,onClickBack:l,onClickCancel:c,onClickSend:g,onClickNetworkFeeSetting:f})=>{const x=s.useMemo(()=>r.isLoading||i||r.isSimulateError?!0:Number(n?.amount||0)<=0,[i,r.isLoading,r.isSimulateError,n]),w=s.useMemo(()=>i?"Insufficient network fee":"",[i]);return e.jsxs(B,{children:[e.jsx("div",{className:"sub-header-wrapper",children:e.jsx(y,{leftElement:{element:e.jsx("img",{src:`${T}`,alt:"back image"}),onClick:l},title:`Sending ${m.symbol}`})}),e.jsxs("div",{className:"info-wrapper",children:[e.jsx(N,{tokenImage:p,value:o.value,denom:o.denom}),e.jsx("div",{className:"direction-icon-wrapper",children:e.jsx("img",{src:`${b}`,alt:"direction-icon"})}),e.jsx(S,{toAddress:d,memo:u})]}),e.jsx("div",{className:"network-fee-wrapper",children:e.jsx(k,{value:n?.amount||"",denom:n?.denom||"",isError:i,isLoading:r.isLoading,errorMessage:w,onClickSetting:f})}),a&&e.jsxs("div",{className:"simulate-error-banner",children:[e.jsx("span",{className:"error-label",children:"ERROR: "}),e.jsx("span",{className:"error-text",children:a})]}),e.jsx("div",{className:"bottom-spacer"}),e.jsx(v,{filled:!0,leftButton:{text:"Cancel",onClick:c},rightButton:{text:"Send",primary:!0,onClick:g,disabled:x}})]})};C.__docgenInfo={description:"",methods:[],displayName:"TransferSummary",props:{tokenMetainfo:{required:!0,tsType:{name:"TokenModel"},description:""},tokenImage:{required:!0,tsType:{name:"string"},description:""},transferBalance:{required:!0,tsType:{name:"Amount"},description:""},toAddress:{required:!0,tsType:{name:"string"},description:""},networkFee:{required:!0,tsType:{name:"union",raw:"NetworkFeeType | null",elements:[{name:"NetworkFeeType"},{name:"null"}]},description:""},memo:{required:!0,tsType:{name:"string"},description:""},currentBalance:{required:!0,tsType:{name:"union",raw:"number | null | undefined",elements:[{name:"number"},{name:"null"},{name:"undefined"}]},description:""},useNetworkFeeReturn:{required:!0,tsType:{name:"UseNetworkFeeReturn"},description:""},isErrorNetworkFee:{required:!1,tsType:{name:"boolean"},description:""},isLoadingNetworkFee:{required:!1,tsType:{name:"boolean"},description:""},simulateErrorBannerMessage:{required:!1,tsType:{name:"union",raw:"string | null",elements:[{name:"string"},{name:"null"}]},description:""},onClickBack:{required:!0,tsType:{name:"signature",type:"function",raw:"() => void",signature:{arguments:[],return:{name:"void"}}},description:""},onClickCancel:{required:!0,tsType:{name:"signature",type:"function",raw:"() => void",signature:{arguments:[],return:{name:"void"}}},description:""},onClickSend:{required:!0,tsType:{name:"signature",type:"function",raw:"() => void",signature:{arguments:[],return:{name:"void"}}},description:""},onClickNetworkFeeSetting:{required:!0,tsType:{name:"signature",type:"function",raw:"() => void",signature:{arguments:[],return:{name:"void"}}},description:""}}};export{C as T};
