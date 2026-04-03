import{m as t,j as e}from"./global-style-Be4sOX77.js";import{M as s}from"./manage-token-search-B1vkD3Oi.js";import{f as d,g as r,d as p}from"./theme-D2qI5cuM.js";const o=p.div`
  ${t.flex({direction:"row",justify:"flex-start"})};
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
`,l=({keyword:i,onChangeKeyword:n})=>e.jsxs(o,{children:[e.jsx("div",{className:"search-icon-wrapper",children:e.jsx("img",{className:"search",src:s,alt:"search icon"})}),e.jsx("div",{className:"input-wrapper",children:e.jsx("input",{className:"search-input",value:i,onChange:a=>n(a.target.value),placeholder:"Search"})})]});l.__docgenInfo={description:"",methods:[],displayName:"ManageCollectionSearchInput",props:{keyword:{required:!0,tsType:{name:"string"},description:""},onChangeKeyword:{required:!0,tsType:{name:"signature",type:"function",raw:"(keyword: string) => void",signature:{arguments:[{type:{name:"string"},name:"keyword"}],return:{name:"void"}}},description:""}}};export{l as M};
