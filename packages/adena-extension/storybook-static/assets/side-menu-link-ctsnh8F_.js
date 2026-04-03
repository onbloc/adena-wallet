import{m as s,j as e}from"./global-style-Be4sOX77.js";import{f as o,g as i,d as a}from"./theme-D2qI5cuM.js";const d=a.div`
  ${s.flex({direction:"row",justify:"flex-start"})};
  width: 100%;
  height: auto;
  padding: 16px 20px;
  background-color: ${i("neutral","_9")};
  transition: 0.2s;
  cursor: pointer;

  &:hover {
    background-color: ${i("neutral","_7")};
  }

  .icon {
    width: 16px;
    height: 16px;
  }

  .title {
    width: 100%;
    margin-left: 12px;
    ${o.body2Reg}
  }
`,p=({icon:t,text:r,onClick:n})=>e.jsxs(d,{onClick:n,children:[e.jsx("img",{className:"icon",src:t,alt:"icon"}),e.jsx("span",{className:"title",children:r})]});p.__docgenInfo={description:"",methods:[],displayName:"SideMenuLink",props:{icon:{required:!0,tsType:{name:"string"},description:""},text:{required:!0,tsType:{name:"string"},description:""},onClick:{required:!0,tsType:{name:"signature",type:"function",raw:"() => void",signature:{arguments:[],return:{name:"void"}}},description:""}}};export{p as S};
