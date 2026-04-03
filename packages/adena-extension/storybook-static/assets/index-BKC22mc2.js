import{m as i,j as t}from"./global-style-Be4sOX77.js";import{f as o,g as s,d as a,r as p}from"./theme-D2qI5cuM.js";const d=a.div`
  ${i.flex({direction:"row"})};
  flex-shrink: 0;
  width: 180px;
  height: 24px;
  margin: 24px auto;
  cursor: pointer;
  transition: 0.2s;

  &:hover {
    opacity: 0.7;
  }

  .title {
    color: ${s("neutral","a")};
    ${o.body1Reg};
    white-space: pre;
    text-decoration: underline;
  }
`,c=({text:r,onClick:e})=>{const n=p.useCallback(()=>{e()},[e]);return t.jsx(d,{onClick:n,children:t.jsx("span",{className:"title",children:r})})};c.__docgenInfo={description:"",methods:[],displayName:"UnderlineTextButton",props:{text:{required:!0,tsType:{name:"string"},description:""},onClick:{required:!0,tsType:{name:"signature",type:"function",raw:"() => void",signature:{arguments:[],return:{name:"void"}}},description:""}}};export{c as U};
