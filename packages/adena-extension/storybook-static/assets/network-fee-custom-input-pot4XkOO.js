import{m as n,j as t}from"./global-style-Be4sOX77.js";import{f as r,g as e,d as a,r as c}from"./theme-D2qI5cuM.js";const g=a.div`
  ${n.flex({direction:"column",justify:"flex-start",align:"flex-start"})};
  width: 100%;
  gap: 4px;

  .description {
    padding: 0 16px;
    ${r.captionReg};
    height: 14px;
    color: ${e("neutral","_1")};
  }
`,m=a.div`
  ${n.flex({direction:"row",justify:"space-between"})};
  width: 100%;
  padding: 14px 16px;
  background-color: ${e("neutral","_9")};
  border: 1px solid ${e("neutral","_7")};
  border-radius: 30px;

  & .fee-input {
    ${n.flex({direction:"row"})};
    width: 100%;
    ${r.body2Reg};
  }

  & .denom {
    ${n.flex({direction:"row"})};
    flex-shrink: 0;
    ${e("neutral","_1")};
    ${r.light13}
  }

  & .description {
    position: relative;
    padding: 0 16px;
    ${r.captionReg};
    height: 14px;
    color: ${e("neutral","_1")};
  }
`,x=({value:p,changeValue:u})=>{const[i,s]=c.useState(p),d=o=>{s(o.target.value)},l=()=>{const o=u(i);s(o)};return t.jsxs(g,{children:[t.jsx("span",{className:"description",children:"Network Fee Multiplier"}),t.jsx(m,{children:t.jsx("input",{className:"fee-input",type:"number",value:i,onChange:d,onBlur:l,placeholder:"Enter Custom Network Fee"})})]})};x.__docgenInfo={description:"",methods:[],displayName:"NetworkFeeCustomInput",props:{value:{required:!0,tsType:{name:"string"},description:""},changeValue:{required:!0,tsType:{name:"signature",type:"function",raw:"(value: string) => string",signature:{arguments:[{type:{name:"string"},name:"value"}],return:{name:"string"}}},description:""}}};export{x as N};
