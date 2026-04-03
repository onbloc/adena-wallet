import{m as i,j as e}from"./global-style-Be4sOX77.js";import"./index-Dfwxv35r.js";import"./index-gWriterE.js";import"./index-BPXqDXY6.js";import{T as n}from"./index-VyJW6yi1.js";import"./index-BKC22mc2.js";import"./index-FLo-pS1C.js";import"./index-BcayXZGa.js";import{f as s,g as o,d as m}from"./theme-D2qI5cuM.js";const p=m.div`
  ${i.flex({direction:"row",justify:"space-between"})};
  width: 100%;
  height: auto;
  padding: 20px;
  background-color: ${o("neutral","_9")};
  border-radius: 18px;

  .token-image {
    width: 30px;
    height: 30px;
  }

  .balance {
    display: contents;
    ${s.header5};
  }
`,d=({tokenImage:r,value:t,denom:a})=>e.jsxs(p,{children:[e.jsx("img",{className:"token-image",src:r,alt:"token image"}),e.jsx("span",{className:"balance",children:e.jsx(n,{value:t,denom:a,fontStyleKey:"header5",minimumFontSize:"16px",orientation:"HORIZONTAL"})})]});d.__docgenInfo={description:"",methods:[],displayName:"TransferSummaryBalance",props:{tokenImage:{required:!0,tsType:{name:"string"},description:""},value:{required:!0,tsType:{name:"string"},description:""},denom:{required:!0,tsType:{name:"string"},description:""}}};export{d as T};
