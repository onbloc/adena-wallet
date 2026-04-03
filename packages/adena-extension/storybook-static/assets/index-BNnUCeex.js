import{m as d,j as e}from"./global-style-Be4sOX77.js";import{M as p}from"./manage-token-list-CBwgxNpt.js";import{M as m}from"./manage-token-search-input-BhecK2FC.js";import{f as u,g as r,d as c}from"./theme-D2qI5cuM.js";const l=c.div`
  ${d.flex({align:"normal",justify:"normal"})};
  width: 100%;
  height: auto;

  .list-wrapper {
    display: flex;
    margin-top: 24px;
    max-height: 284px;
    overflow-y: auto;
    padding-bottom: 24px;
  }

  .close-wrapper {
    position: absolute;
    display: flex;
    left: 0;
    bottom: 0;
    width: 100%;
    height: 96px;
    padding: 24px 20px;
    box-shadow: 0px -4px 4px rgba(0, 0, 0, 0.4);

    .close {
      width: 100%;
      height: 100%;
      background-color: ${r("neutral","_5")};
      border-radius: 30px;
      ${u.body1Bold};
      transition: 0.2s;

      &:hover {
        background-color: ${r("neutral","_6")};
      }
    }
  }
`,g=({keyword:n,tokens:a,onClickClose:t,onClickAdded:o,onChangeKeyword:i,onToggleActiveItem:s})=>e.jsxs(l,{children:[e.jsxs("div",{className:"content-wrapper",children:[e.jsx("div",{className:"input-wrapper",children:e.jsx(m,{keyword:n,onClickAdded:o,onChangeKeyword:i})}),e.jsx("div",{className:"list-wrapper",children:e.jsx(p,{tokens:a,onToggleActiveItem:s})})]}),e.jsx("div",{className:"close-wrapper",children:e.jsx("button",{className:"close",onClick:t,children:"Close"})})]});g.__docgenInfo={description:"",methods:[],displayName:"ManageTokenSearch",props:{keyword:{required:!0,tsType:{name:"string"},description:""},tokens:{required:!0,tsType:{name:"Array",elements:[{name:"ManageTokenInfo"}],raw:"ManageTokenInfo[]"},description:""},onClickAdded:{required:!0,tsType:{name:"signature",type:"function",raw:"() => void",signature:{arguments:[],return:{name:"void"}}},description:""},onClickClose:{required:!0,tsType:{name:"signature",type:"function",raw:"() => void",signature:{arguments:[],return:{name:"void"}}},description:""},onChangeKeyword:{required:!0,tsType:{name:"signature",type:"function",raw:"(keyword: string) => void",signature:{arguments:[{type:{name:"string"},name:"keyword"}],return:{name:"void"}}},description:""},onToggleActiveItem:{required:!0,tsType:{name:"signature",type:"function",raw:"(tokenId: string, activated: boolean) => void",signature:{arguments:[{type:{name:"string"},name:"tokenId"},{type:{name:"boolean"},name:"activated"}],return:{name:"void"}}},description:""}}};export{g as M};
