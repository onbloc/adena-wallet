import{j as e}from"./global-style-Be4sOX77.js";import{b as u}from"./chevron-left-BXSSadT9.js";import"./index-Ct-w3XHB.js";import{P as l,R as a,V as p}from"./index-CLRA8FOO.js";import"./index-DrT1707K.js";import"./index-DjFTnIrN.js";import"./index-DacC881Y.js";import"./index-BxhAeZbh.js";import"./index-CulhM7-u.js";import"./index-CpLq81TF.js";import"./index-Bv2zqv-E.js";import"./index-g6zNktBg.js";import{W as b}from"./index-B3tmVslE.js";import"./index-C6Pb5J-W.js";import"./index-C0j4FPrl.js";import"./index-jlviZXHb.js";import{_ as g}from"./lodash-BU2fF3dy.js";import{n as x,r as k,R as _,d as s}from"./theme-D2qI5cuM.js";import"./index-BAMY2Nnw.js";import"./bignumber-B1z4pYDt.js";const f=s(a)`
  width: 100%;
  justify-content: space-between;
  padding-bottom: 16px;
`,h=s(p)`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: ${({theme:o,selected:r})=>r?o.webPrimary._100:"rgba(0, 89, 255, 0.32)"};
`,y=s(p)`
  width: 32px;
`,c=({onClickGoBack:o,currentStep:r,stepLength:n})=>{const m=x(),d=k.useMemo(()=>r&&r>-1,[r]);return e.jsxs(f,{children:[e.jsx(l,{onClick:o,style:{padding:4,backgroundColor:m.webInput._100,borderRadius:16},children:e.jsx(b,{src:u,size:24})}),e.jsx(a,{style:{columnGap:8},children:n>1&&d&&e.jsx(_.Fragment,{children:g.times(n,i=>e.jsx(h,{selected:i===r},i))})}),e.jsx(y,{})]})};c.__docgenInfo={description:"",methods:[],displayName:"WebMainHeader",props:{stepLength:{required:!0,tsType:{name:"number"},description:""},onClickGoBack:{required:!0,tsType:{name:"signature",type:"function",raw:"() => void",signature:{arguments:[],return:{name:"void"}}},description:""},currentStep:{required:!1,tsType:{name:"number"},description:""}}};const{action:j}=__STORYBOOK_MODULE_ACTIONS__,z={title:"components/pages/WebMainHeader",component:c},t={args:{currentStep:1,stepLength:4,onClickGoBack:j("click back")}};t.parameters={...t.parameters,docs:{...t.parameters?.docs,source:{originalSource:`{
  args: {
    currentStep: 1,
    stepLength: 4,
    onClickGoBack: action('click back')
  }
}`,...t.parameters?.docs?.source}}};const A=["Default"];export{t as Default,A as __namedExportsOrder,z as default};
