import{j as e}from"./global-style-Be4sOX77.js";import{b as l}from"./chevron-left-BXSSadT9.js";import"./index-Ct-w3XHB.js";import{P as b,R as a,V as c}from"./index-CLRA8FOO.js";import"./index-DrT1707K.js";import"./index-DjFTnIrN.js";import"./index-DacC881Y.js";import"./index-BxhAeZbh.js";import"./index-CulhM7-u.js";import"./index-CpLq81TF.js";import"./index-Bv2zqv-E.js";import"./index-g6zNktBg.js";import{W as g}from"./index-B3tmVslE.js";import"./index-C6Pb5J-W.js";import"./index-C0j4FPrl.js";import"./index-jlviZXHb.js";import{_ as y}from"./lodash-BU2fF3dy.js";import{n as k,d as i}from"./theme-D2qI5cuM.js";import"./index-BAMY2Nnw.js";import"./bignumber-B1z4pYDt.js";const x=i(a)`
  width: 100%;
  height: 32px;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
`,h=i(c)`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: ${({theme:o,selected:t})=>t?o.webPrimary._100:"rgba(0, 89, 255, 0.32)"};
`,n=i(c)`
  width: 24px;
`,p=({currentStep:o,stepLength:t,visibleBackButton:m,onClickGoBack:d})=>{const u=k();return e.jsxs(x,{children:[m?e.jsx(b,{onClick:d,style:{padding:4,backgroundColor:u.webInput._100,borderRadius:16},children:e.jsx(g,{src:l,size:24})}):e.jsx(n,{}),t>0&&e.jsx(a,{style:{columnGap:8},children:y.times(t,s=>e.jsx(h,{selected:s===o},s))}),e.jsx(n,{})]})};p.__docgenInfo={description:"",methods:[],displayName:"WebSecurityHeader",props:{currentStep:{required:!1,tsType:{name:"number"},description:""},stepLength:{required:!0,tsType:{name:"number"},description:""},visibleBackButton:{required:!0,tsType:{name:"boolean"},description:""},onClickGoBack:{required:!0,tsType:{name:"signature",type:"function",raw:"() => void",signature:{arguments:[],return:{name:"void"}}},description:""}}};const{action:_}=__STORYBOOK_MODULE_ACTIONS__,V={title:"components/pages/WebSecurityHeader",component:p},r={args:{currentStep:0,stepLength:2,visibleBackButton:!0,onClickGoBack:_("click back")}};r.parameters={...r.parameters,docs:{...r.parameters?.docs,source:{originalSource:`{
  args: {
    currentStep: 0,
    stepLength: 2,
    visibleBackButton: true,
    onClickGoBack: action('click back')
  }
}`,...r.parameters?.docs?.source}}};const z=["Default"];export{r as Default,z as __namedExportsOrder,V as default};
