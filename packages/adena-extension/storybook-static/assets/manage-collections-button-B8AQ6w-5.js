import{m as n,j as e}from"./global-style-Be4sOX77.js";import{M as o}from"./main-manage-tokens-filter-C-EQaO2g.js";import{f as i,g as a,d as r}from"./theme-D2qI5cuM.js";const s=r.div`
  ${n.flex({direction:"row"})};
  flex-shrink: 0;
  width: auto;
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
    ${i.body1Reg};
  }
`,c=({onClick:t})=>e.jsxs(s,{onClick:t,children:[e.jsx("img",{className:"icon",src:o,alt:"mange token filter icon"}),e.jsx("span",{className:"title",children:"Manage Collectables"})]});c.__docgenInfo={description:"",methods:[],displayName:"ManageCollectionsButton",props:{onClick:{required:!0,tsType:{name:"signature",type:"function",raw:"() => void",signature:{arguments:[],return:{name:"void"}}},description:""}}};export{c as M};
