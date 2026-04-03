import{m as c,j as t}from"./global-style-Be4sOX77.js";import{S as B,a as P}from"./index-CulhM7-u.js";import{m as H}from"./string-utils-Bff5ZSZ1.js";import"./index-Ct-w3XHB.js";import"./index-CLRA8FOO.js";import"./index-DrT1707K.js";import"./index-DjFTnIrN.js";import"./index-DacC881Y.js";import"./index-BxhAeZbh.js";import"./index-CpLq81TF.js";import"./index-Bv2zqv-E.js";import"./index-g6zNktBg.js";import"./index-B3tmVslE.js";import"./index-C6Pb5J-W.js";import"./index-C0j4FPrl.js";import"./index-jlviZXHb.js";import{A as M}from"./additional-token-info-4d5iMnSu.js";import{A as C}from"./additional-token-select-box-DuguXEiF.js";import{f as D,g as r,d as I,r as i}from"./theme-D2qI5cuM.js";import{A as K}from"./additional-token-path-input-DWZJrv3I.js";import{a as W,A as q}from"./additional-token-type-selector-SvgnClqU.js";const z=I.div`
  ${c.flex({align:"normal",justify:"normal"})};
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 444px;

  .sub-header-container {
    margin-top: 5px;
    margin-bottom: 24px;
  }

  .type-selector-wrapper {
    display: flex;
    width: 100%;
    margin-bottom: 12px;
  }

  .select-box-wrapper {
    display: flex;
    margin-bottom: 12px;
  }

  .info-wrapper {
    display: flex;
    height: 100%;
    overflow-y: auto;
  }

  .button-group {
    ${c.flex({direction:"row",align:"normal",justify:"space-between"})};
    position: absolute;
    width: 100%;
    bottom: 0;

    button {
      display: inline-flex;
      width: 100%;
      height: 48px;
      border-radius: 30px;
      align-items: center;
      justify-content: center;
      ${D.body1Bold}
      transition: 0.2s;

      &:last-child {
        margin-left: 12px;
      }

      &.cancel-button {
        background-color: ${r("neutral","_5")};

        &:hover {
          background-color: ${r("neutral","_6")};
        }
      }

      &.add-button {
        background-color: ${r("primary","_6")};

        &:hover {
          background-color: ${r("primary","_7")};
        }

        &.disabled {
          color: ${r("neutral","_5")};
          background-color: ${r("primary","_9")};
          cursor: default;
        }
      }
    }
  }
`,F=({opened:u,selected:b,addingType:a,keyword:x,manualTokenPath:h,tokenInfos:s,selectedTokenPath:l,selectedTokenInfo:o,isLoadingManualGRC20Token:m,isLoadingSelectedGRC20Token:p,errorManualGRC20Token:e,selectAddingType:f,onChangeKeyword:g,onChangeManualTokenPath:y,onClickOpenButton:j,onClickListItem:A,onClickBack:w,onClickCancel:k,onClickAdd:v})=>{const d=i.useMemo(()=>a===W.SEARCH,[a]),$=i.useMemo(()=>d?p:m,[a,m,p]),N=i.useMemo(()=>e?e.message:null,[e]),_=i.useMemo(()=>o&&!e,[o,e]),S=i.useMemo(()=>{const n=s.find(E=>E.path===l);return n?{name:n.name,symbol:n.symbol}:null},[l,s]);return t.jsxs(z,{children:[t.jsx("div",{className:"sub-header-container",children:t.jsx(B,{title:"Add Custom Token",leftElement:{element:t.jsx("img",{src:P,alt:"back icon"}),onClick:w}})}),t.jsx("div",{className:"type-selector-wrapper",children:t.jsx(q,{type:a,setType:f})}),t.jsx("div",{className:"select-box-wrapper",children:d?t.jsx(C,{opened:u,selected:b,keyword:x,tokenInfos:s,selectedInfo:S||null,onChangeKeyword:g,onClickOpenButton:j,onClickListItem:A}):t.jsx(K,{keyword:h,onChangeKeyword:y,errorMessage:N})}),t.jsx("div",{className:"info-wrapper",children:t.jsx(M,{isLoading:$,symbol:o?.symbol||"",path:H(o?.pathInfo||""),decimals:o?`${o.decimals}`:""})}),t.jsxs("div",{className:"button-group",children:[t.jsx("button",{className:"cancel-button",onClick:k,children:"Cancel"}),t.jsx("button",{className:_?"add-button":"add-button disabled",onClick:v,children:"Add"})]})]})};F.__docgenInfo={description:"",methods:[],displayName:"AdditionalToken"};export{F as A};
