import{m as x,j as e}from"./global-style-Be4sOX77.js";import{S as h,a as E}from"./index-CulhM7-u.js";import{A as T}from"./transfer-arrow-down-BmHx-tM0.js";import{B as k}from"./base-error-B60qQlbC.js";import"./index-Ct-w3XHB.js";import"./index-CLRA8FOO.js";import"./index-DrT1707K.js";import"./index-DjFTnIrN.js";import"./index-DacC881Y.js";import"./index-BxhAeZbh.js";import"./index-CpLq81TF.js";import"./index-Bv2zqv-E.js";import"./index-g6zNktBg.js";import"./index-B3tmVslE.js";import"./index-C6Pb5J-W.js";import"./index-C0j4FPrl.js";import"./index-jlviZXHb.js";import{N,B as R}from"./index-Dfwxv35r.js";import"./index-gWriterE.js";import"./index-BPXqDXY6.js";import"./index-VyJW6yi1.js";import"./index-BKC22mc2.js";import"./index-FLo-pS1C.js";import"./index-BcayXZGa.js";import{N as F}from"./nft-asset-image-card-7BXszIRp.js";import{T as v}from"./transfer-summary-address-D6c0zcQF.js";import{f as s,g as r,d as _,r as a}from"./theme-D2qI5cuM.js";const j={MEMO_TOO_LARGE_ERROR:{status:1e3,type:"MEMO_TOO_LARGE_ERROR",message:"Memo too large"},INSUFFICIENT_NETWORK_FEE:{status:1001,type:"INSUFFICIENT_NETWORK_FEE",message:"Insufficient network fee"}};class i extends k{constructor(n){super(j[n]),Object.setPrototypeOf(this,i.prototype)}}const b=_.div`
  ${x.flex({align:"normal",justify:"flex-start"})};
  position: relative;
  width: 100%;
  height: 100%;
  min-height: auto;
  align-items: center;

  .sub-header-wrapper {
    width: 100%;
  }

  .info-wrapper {
    width: 100%;
    margin-top: 25px;

    .asset-card-wrapper {
      width: 100px;
      margin: 0 auto;
    }
  }

  .direction-icon-wrapper {
    width: 100%;
    text-align: center;
    margin: 10px 0;
  }

  .network-fee-wrapper {
    width: 100%;
    height: 100%;
    margin-top: 12px;

    .error-message {
      position: relative;
      width: 100%;
      padding: 0 16px;
      ${s.captionReg};
      font-size: 13px;
      color: ${r("red","_5")};
    }
  }

  .button-group {
    position: absolute;
    display: flex;
    width: 100%;
    bottom: 0;
    justify-content: space-between;

    button {
      width: 100%;
      height: 48px;
      border-radius: 30px;
      ${s.body1Bold};
      background-color: ${r("neutral","_5")};
      transition: 0.2s;

      &:hover {
        background-color: ${r("neutral","_6")};
      }

      &:last-child {
        margin-left: 10px;
      }

      &.send {
        background-color: ${r("primary","_6")};

        &:hover {
          background-color: ${r("primary","_7")};
        }
      }
    }
  }
`,I=({grc721Token:t,toAddress:n,networkFee:o,memo:m,isErrorNetworkFee:p,queryGRC721TokenUri:u,onClickBack:d,onClickCancel:l,onClickSend:c,onClickNetworkFeeSetting:g})=>{const w=new i("INSUFFICIENT_NETWORK_FEE"),y=a.useMemo(()=>`Sending ${t.name} #${t.tokenId}`,[t]),f=a.useMemo(()=>w.message,[]);return e.jsxs(b,{children:[e.jsx("div",{className:"sub-header-wrapper",children:e.jsx(h,{leftElement:{element:e.jsx("img",{src:`${E}`,alt:"back image"}),onClick:d},title:y})}),e.jsxs("div",{className:"info-wrapper",children:[e.jsx("div",{className:"asset-card-wrapper",children:e.jsx(F,{asset:t,queryGRC721TokenUri:u})}),e.jsx("div",{className:"direction-icon-wrapper",children:e.jsx("img",{src:`${T}`,alt:"direction-icon"})}),e.jsx(v,{toAddress:n,memo:m})]}),e.jsx("div",{className:"network-fee-wrapper",children:e.jsx(N,{isError:p,value:o?.amount||"",denom:o?.denom||"",errorMessage:f,onClickSetting:g})}),e.jsx(R,{leftButton:{text:"Cancel",onClick:l},rightButton:{text:"Send",onClick:c,primary:!0},filled:!0})]})};I.__docgenInfo={description:"",methods:[],displayName:"NFTTransferSummary",props:{grc721Token:{required:!0,tsType:{name:"GRC721Model"},description:""},toAddress:{required:!0,tsType:{name:"string"},description:""},networkFee:{required:!0,tsType:{name:"union",raw:"NetworkFeeType | null",elements:[{name:"NetworkFeeType"},{name:"null"}]},description:""},memo:{required:!0,tsType:{name:"string"},description:""},isErrorNetworkFee:{required:!1,tsType:{name:"boolean"},description:""},queryGRC721TokenUri:{required:!0,tsType:{name:"signature",type:"function",raw:`(
  packagePath: string,
  tokenId: string,
  options?: UseQueryOptions<string | null, Error>,
) => UseQueryResult<string | null>`,signature:{arguments:[{type:{name:"string"},name:"packagePath"},{type:{name:"string"},name:"tokenId"},{type:{name:"UseQueryOptions",elements:[{name:"union",raw:"string | null",elements:[{name:"string"},{name:"null"}]},{name:"Error"}],raw:"UseQueryOptions<string | null, Error>"},name:"options"}],return:{name:"UseQueryResult",elements:[{name:"union",raw:"string | null",elements:[{name:"string"},{name:"null"}]}],raw:"UseQueryResult<string | null>"}}},description:""},onClickBack:{required:!0,tsType:{name:"signature",type:"function",raw:"() => void",signature:{arguments:[],return:{name:"void"}}},description:""},onClickCancel:{required:!0,tsType:{name:"signature",type:"function",raw:"() => void",signature:{arguments:[],return:{name:"void"}}},description:""},onClickSend:{required:!0,tsType:{name:"signature",type:"function",raw:"() => void",signature:{arguments:[],return:{name:"void"}}},description:""},onClickNetworkFeeSetting:{required:!0,tsType:{name:"signature",type:"function",raw:"() => void",signature:{arguments:[],return:{name:"void"}}},description:""}}};export{I as N,i as T};
