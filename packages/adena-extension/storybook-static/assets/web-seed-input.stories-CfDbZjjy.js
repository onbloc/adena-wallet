import{j as p}from"./global-style-Be4sOX77.js";import{r as t,w as f,l as n,d as l,f as _}from"./theme-D2qI5cuM.js";import{R as $,V as v}from"./index-CLRA8FOO.js";import"./index-BAMY2Nnw.js";const y=e=>!["hover","focus","filled","error"].includes(e),C=l($).withConfig({shouldForwardProp:y})`
  width: 100%;
  height: 40px;
  position: relative;
  overflow: hidden;
  border-radius: 10px;
  border: 1px solid ${({theme:e})=>e.webNeutral._800};
  ${f.body4}

  ${({theme:e,hover:r,focus:o,filled:s})=>r||o||s?n`
          border-color: ${e.webNeutral._600};
        `:""}
  
  ${({filled:e})=>e?n`
          box-shadow:
            0px 0px 0px 3px rgba(255, 255, 255, 0.04),
            0px 1px 3px 0px rgba(0, 0, 0, 0.1),
            0px 1px 2px 0px rgba(0, 0, 0, 0.06);
        `:""}

  ${({theme:e,error:r})=>r?n`
          color: ${e.webError._100};
          background: #e0517014;
          border-color: ${e.webError._200};
          box-shadow:
            0px 0px 0px 3px rgba(235, 84, 94, 0.12),
            0px 1px 3px 0px rgba(0, 0, 0, 0.1),
            0px 1px 2px 0px rgba(0, 0, 0, 0.06);
        `:""}
`,I=l(v).withConfig({shouldForwardProp:e=>!["hover","focus","filled","error"].includes(e)})`
  width: 90px;
  height: 100%;
  background: ${({theme:e})=>e.webInput._100};
  border-right: 1px solid ${({theme:e})=>e.webNeutral._800};
  align-items: center;
  justify-content: center;
  color: ${({theme:e})=>e.webNeutral._500};
  ${_.body2Reg}

  ${({theme:e,hover:r,focus:o})=>r||o?n`
          border-color: ${e.webNeutral._600};
        `:""}

  ${({theme:e,error:r})=>r?n`
          color: ${({theme:o})=>o.webNeutral._500};
          border-color: ${e.webError._200};
        `:""}
`,S=l.input.withConfig({shouldForwardProp:e=>!["hover","focus","filled","error"].includes(e)})`
  flex: 1;
  width: 100%;
  height: 40px;
  padding: 12px;
  border-radius: 0;
  border: none;
  outline: none;
  box-shadow: none;
  background: ${({error:e,theme:r})=>e?r.webError._300:r.webNeutral._900};
  color: ${({theme:e})=>e.webNeutral._100};
`,b=({index:e,value:r,error:o,onChange:s})=>{const[d,c]=t.useState(!1),[i,x]=t.useState(!1),u=t.useMemo(()=>r.length>0,[r]),g=t.useMemo(()=>`Word #${e+1}`,[e]),h=t.useCallback(m=>{const w=m.target.value;s(w)},[s]);return p.jsxs(C,{hover:d,focus:i,filled:u,error:o,onMouseOver:()=>c(!0),onMouseOut:()=>c(!1),children:[p.jsx(I,{hover:d,focus:i,filled:u,error:o,children:g}),p.jsx(S,{hover:d,focus:i,filled:u,value:r,onFocus:()=>x(!0),onBlur:()=>x(!1),onChange:h,error:o})]})};b.__docgenInfo={description:"",methods:[],displayName:"WebSeedValidateInputItem",props:{index:{required:!0,tsType:{name:"number"},description:""},value:{required:!0,tsType:{name:"string"},description:""},error:{required:!0,tsType:{name:"boolean"},description:""},onChange:{required:!0,tsType:{name:"signature",type:"function",raw:"(value: string) => void",signature:{arguments:[{type:{name:"string"},name:"value"}],return:{name:"void"}}},description:""}}};const{action:N}=__STORYBOOK_MODULE_ACTIONS__,F={title:"components/atoms/WebSeedValidateInputItem",component:b},a={args:{index:1,value:"",error:!1,onChange:N("onChange")}};a.parameters={...a.parameters,docs:{...a.parameters?.docs,source:{originalSource:`{
  args: {
    index: 1,
    value: '',
    error: false,
    onChange: action('onChange')
  }
}`,...a.parameters?.docs?.source}}};const k=["Default"];export{a as Default,k as __namedExportsOrder,F as default};
