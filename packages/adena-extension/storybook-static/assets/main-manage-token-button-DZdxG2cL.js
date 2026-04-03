import{m as t,j as e}from"./global-style-Be4sOX77.js";import{M as i}from"./main-manage-tokens-filter-C-EQaO2g.js";import{f as o,g as a,d as r}from"./theme-D2qI5cuM.js";const s=r.div`
  ${t.flex({direction:"row"})};
  flex-shrink: 0;
  width: 156px;
  height: 24px;
  cursor: pointer;
  transition: 0.2s;

  &:hover {
    opacity: 0.7;
  }

  .icon {
    width: 24px;
    height: 24px;
    margin-right: 5px;
  }

  .title {
    color: ${a("neutral","a")};
    ${o.body1Reg};
  }
`,p=({onClick:n})=>e.jsxs(s,{onClick:n,children:[e.jsx("img",{className:"icon",src:i,alt:"mange token filter icon"}),e.jsx("span",{className:"title",children:"Manage Tokens"})]});p.__docgenInfo={description:"",methods:[],displayName:"MainManageTokenButton",props:{onClick:{required:!0,tsType:{name:"signature",type:"function",raw:"() => void",signature:{arguments:[],return:{name:"void"}}},description:""}}};export{p as M};
