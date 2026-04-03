import{m as a,j as e}from"./global-style-Be4sOX77.js";import{A as u,a as f}from"./common-arrow-up-gray-kFpYaQkk.js";import"./index-Ct-w3XHB.js";import"./index-CLRA8FOO.js";import"./index-DrT1707K.js";import"./index-DjFTnIrN.js";import"./index-DacC881Y.js";import{S as g}from"./index-BxhAeZbh.js";import"./index-CulhM7-u.js";import"./index-CpLq81TF.js";import"./index-Bv2zqv-E.js";import"./index-g6zNktBg.js";import"./index-B3tmVslE.js";import"./index-C6Pb5J-W.js";import"./index-C0j4FPrl.js";import"./index-jlviZXHb.js";import{A as w}from"./additional-token-search-list-BSrOoFjc.js";import{f as b,g as r,d as j,r as n}from"./theme-D2qI5cuM.js";const y=j.div`
  ${a.flex({align:"normal",justify:"normal"})};
  position: relative;
  width: 100%;
  height: 48px;

  .fixed-wrapper {
    ${a.flex({align:"normal",justify:"normal"})};
    position: relative;
    width: 100%;
    height: auto;
    min-height: 48px;
    border-radius: 30px;
    border: 1px solid ${r("neutral","_7")};
    background-color: ${r("neutral","_9")};
    overflow: hidden;
    z-index: 2;

    &.opened {
      position: absolute;
      border-radius: 18px;
      margin-bottom: 48px;
    }
  }

  .select-box {
    display: flex;
    width: 100%;
    height: 48px;
    padding: 13px;
    cursor: pointer;
    user-select: none;

    .title {
      width: calc(100% - 20px);
      padding: 0 4px;
      ${b.body2Reg};
      color: ${r("neutral","a")};
    }

    .icon-wrapper {
      display: flex;
      width: 20px;
      height: 20px;
    }

    &.selected {
      display: flex;
      width: 100%;
      justify-content: space-between;

      .title {
        display: flex;
        color: ${r("neutral","_1")};

        .name {
          display: block;
          text-overflow: ellipsis;
          overflow: hidden;
        }

        .symbol {
          display: flex;
          padding-left: 2px;
        }
      }
    }
  }

  .list-wrapper {
    .search-input-wrapper {
      height: 48px;
      padding: 4px 5px;
      border-top: 1px solid ${r("neutral","_7")};

      & > * {
        background-color: ${r("neutral","_7")};
      }
    }
  }
`,$=({opened:t,keyword:l,tokenInfos:p,selected:o,selectedInfo:s,onChangeKeyword:d,onClickOpenButton:c,onClickListItem:m})=>{const x=n.useMemo(()=>{const i=s?.name;return!o||!i?"":i},[o,s]),h=n.useMemo(()=>{const i=s?.symbol;return!o||!i?"":i.length>5?`(${i.slice(0,5)}...)`:`(${i})`},[o,s]);return e.jsx(y,{children:e.jsxs("div",{className:t?"fixed-wrapper opened":"fixed-wrapper",onClick:i=>i.stopPropagation(),children:[e.jsxs("div",{className:o?"select-box selected":"select-box",onClick:()=>c(!t),children:[o?e.jsxs("span",{className:"title",children:[e.jsx("span",{className:"name",children:x}),e.jsx("span",{className:"symbol",children:h})]}):e.jsx("span",{className:"title",children:"Select a GRC20 Token"}),e.jsx("span",{className:"icon-wrapper",children:t?e.jsx("img",{src:`${u}`,alt:"select box opened icon"}):e.jsx("img",{src:`${f}`,alt:"select box unopened icon"})})]}),t&&e.jsxs("div",{className:"list-wrapper",children:[e.jsx("div",{className:"search-input-wrapper",children:e.jsx(g,{keyword:l,onChangeKeyword:d})}),e.jsx(w,{tokenInfos:p,onClickListItem:m})]})]})})};$.__docgenInfo={description:"",methods:[],displayName:"AdditionalTokenSelectBox"};export{$ as A};
