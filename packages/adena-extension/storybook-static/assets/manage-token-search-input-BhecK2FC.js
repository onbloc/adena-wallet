import{m as o,j as e}from"./global-style-Be4sOX77.js";import{M as s}from"./manage-token-search-B1vkD3Oi.js";import{I as p}from"./index-Ct-w3XHB.js";import"./index-CLRA8FOO.js";import"./index-DrT1707K.js";import"./index-DjFTnIrN.js";import"./index-DacC881Y.js";import"./index-BxhAeZbh.js";import"./index-CulhM7-u.js";import"./index-CpLq81TF.js";import"./index-Bv2zqv-E.js";import"./index-g6zNktBg.js";import"./index-B3tmVslE.js";import"./index-C6Pb5J-W.js";import"./index-C0j4FPrl.js";import"./index-jlviZXHb.js";import{f as d,g as r,d as c}from"./theme-D2qI5cuM.js";const m=c.div`
  ${o.flex({direction:"row",justify:"flex-start"})};
  width: 100%;
  height: 48px;
  padding: 12px 16px;
  background-color: ${r("neutral","_9")};
  border-radius: 30px;
  border: 1px solid ${r("neutral","_7")};

  .search-icon-wrapper {
    display: inline-flex;
    flex-shrink: 0;
    width: fit-content;
    align-items: center;
    padding: 0 5px;

    .search {
      width: 17px;
      height: 17px;
    }
  }

  .input-wrapper {
    display: inline-flex;
    flex-shrink: 1;
    width: 100%;
    height: 24px;
    padding: 0 12px;

    .search-input {
      width: 100%;
      ${d.body2Reg};
    }
  }

  .added-icon-wrapper {
    display: inline-flex;
    flex-shrink: 0;
    width: 24px;
    height: 24px;
    align-items: center;
    cursor: pointer;

    .added {
      width: 100%;
      height: 100%;
      fill: ${r("neutral","_7")};
      transition: 0.2s;
    }

    &:hover {
      .added {
        fill: ${r("neutral","b")};
      }
    }
  }
`,l=({keyword:i,onChangeKeyword:n,onClickAdded:t})=>e.jsxs(m,{children:[e.jsx("div",{className:"search-icon-wrapper",children:e.jsx("img",{className:"search",src:s,alt:"search icon"})}),e.jsx("div",{className:"input-wrapper",children:e.jsx("input",{className:"search-input",value:i,onChange:a=>n(a.target.value),placeholder:"Search"})}),e.jsx("div",{className:"added-icon-wrapper",onClick:t,children:e.jsx(p,{className:"added",name:"iconTokenAdded"})})]});l.__docgenInfo={description:"",methods:[],displayName:"ManageTokenSearchInput",props:{keyword:{required:!0,tsType:{name:"string"},description:""},onChangeKeyword:{required:!0,tsType:{name:"signature",type:"function",raw:"(keyword: string) => void",signature:{arguments:[{type:{name:"string"},name:"keyword"}],return:{name:"void"}}},description:""},onClickAdded:{required:!0,tsType:{name:"signature",type:"function",raw:"() => void",signature:{arguments:[],return:{name:"void"}}},description:""}}};export{l as M};
