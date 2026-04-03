import{c as e,i as t}from"./_polyfill-node.global-CL4hvcq6.js";import{_ as n,g as r,i,n as a,o,rt as s,t as c,v as l}from"./iframe-DekVl-_p.js";import{i as u,n as d,r as f}from"./base-D2xGt4mF.js";var p,m,h,g,_,v,y,b=t((()=>{i(),p=e(s()),n(),u(),m=c(),h=e=>![`hover`,`focus`,`filled`,`error`].includes(e),g=r(d).withConfig({shouldForwardProp:h})`
  width: 100%;
  height: 40px;
  position: relative;
  overflow: hidden;
  border-radius: 10px;
  border: 1px solid ${({theme:e})=>e.webNeutral._800};
  ${o.body4}

  ${({theme:e,hover:t,focus:n,filled:r})=>t||n||r?l`
          border-color: ${e.webNeutral._600};
        `:``}
  
  ${({filled:e})=>e?l`
          box-shadow:
            0px 0px 0px 3px rgba(255, 255, 255, 0.04),
            0px 1px 3px 0px rgba(0, 0, 0, 0.1),
            0px 1px 2px 0px rgba(0, 0, 0, 0.06);
        `:``}

  ${({theme:e,error:t})=>t?l`
          color: ${e.webError._100};
          background: #e0517014;
          border-color: ${e.webError._200};
          box-shadow:
            0px 0px 0px 3px rgba(235, 84, 94, 0.12),
            0px 1px 3px 0px rgba(0, 0, 0, 0.1),
            0px 1px 2px 0px rgba(0, 0, 0, 0.06);
        `:``}
`,_=r(f).withConfig({shouldForwardProp:e=>![`hover`,`focus`,`filled`,`error`].includes(e)})`
  width: 90px;
  height: 100%;
  background: ${({theme:e})=>e.webInput._100};
  border-right: 1px solid ${({theme:e})=>e.webNeutral._800};
  align-items: center;
  justify-content: center;
  color: ${({theme:e})=>e.webNeutral._500};
  ${a.body2Reg}

  ${({theme:e,hover:t,focus:n})=>t||n?l`
          border-color: ${e.webNeutral._600};
        `:``}

  ${({theme:e,error:t})=>t?l`
          color: ${({theme:e})=>e.webNeutral._500};
          border-color: ${e.webError._200};
        `:``}
`,v=r.input.withConfig({shouldForwardProp:e=>![`hover`,`focus`,`filled`,`error`].includes(e)})`
  flex: 1;
  width: 100%;
  height: 40px;
  padding: 12px;
  border-radius: 0;
  border: none;
  outline: none;
  box-shadow: none;
  background: ${({error:e,theme:t})=>e?t.webError._300:t.webNeutral._900};
  color: ${({theme:e})=>e.webNeutral._100};
`,y=({index:e,value:t,error:n,onChange:r})=>{let[i,a]=(0,p.useState)(!1),[o,s]=(0,p.useState)(!1),c=(0,p.useMemo)(()=>t.length>0,[t]),l=(0,p.useMemo)(()=>`Word #${e+1}`,[e]),u=(0,p.useCallback)(e=>{let t=e.target.value;r(t)},[r]);return(0,m.jsxs)(g,{hover:i,focus:o,filled:c,error:n,onMouseOver:()=>a(!0),onMouseOut:()=>a(!1),children:[(0,m.jsx)(_,{hover:i,focus:o,filled:c,error:n,children:l}),(0,m.jsx)(v,{hover:i,focus:o,filled:c,value:t,onFocus:()=>s(!0),onBlur:()=>s(!1),onChange:u,error:n})]})},y.__docgenInfo={description:``,methods:[],displayName:`WebSeedValidateInputItem`,props:{index:{required:!0,tsType:{name:`number`},description:``},value:{required:!0,tsType:{name:`string`},description:``},error:{required:!0,tsType:{name:`boolean`},description:``},onChange:{required:!0,tsType:{name:`signature`,type:`function`,raw:`(value: string) => void`,signature:{arguments:[{type:{name:`string`},name:`value`}],return:{name:`void`}}},description:``}}}})),x,S,C,w;t((()=>{b(),{action:x}=__STORYBOOK_MODULE_ACTIONS__,S={title:`components/atoms/WebSeedValidateInputItem`,component:y},C={args:{index:1,value:``,error:!1,onChange:x(`onChange`)}},C.parameters={...C.parameters,docs:{...C.parameters?.docs,source:{originalSource:`{
  args: {
    index: 1,
    value: '',
    error: false,
    onChange: action('onChange')
  }
}`,...C.parameters?.docs?.source}}},w=[`Default`]}))();export{C as Default,w as __namedExportsOrder,S as default};