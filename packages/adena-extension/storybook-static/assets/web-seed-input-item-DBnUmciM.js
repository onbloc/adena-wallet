import{c as e,i as t}from"./_polyfill-node.global-CL4hvcq6.js";import{_ as n,g as r,i,o as a,rt as o,t as s,v as c}from"./iframe-DekVl-_p.js";import{i as l,n as u,r as d}from"./base-D2xGt4mF.js";var f,p,m,h,g,_,v=t((()=>{i(),f=e(o()),n(),l(),p=s(),m=r(u).withConfig({shouldForwardProp:e=>![`hover`,`focus`,`filled`,`error`].includes(e)})`
  width: 100%;
  height: 40px;
  position: relative;
  overflow: hidden;
  border-radius: 10px;
  border: 1px solid ${({theme:e})=>e.webNeutral._800};
  ${a.body4}

  ${({theme:e,hover:t,focus:n,filled:r})=>t||n||r?c`
          border-color: ${e.webNeutral._600};
        `:``}
  
  ${({filled:e})=>e?c`
          box-shadow:
            0px 0px 0px 3px rgba(255, 255, 255, 0.04),
            0px 1px 3px 0px rgba(0, 0, 0, 0.1),
            0px 1px 2px 0px rgba(0, 0, 0, 0.06);
        `:``}

  ${({theme:e,error:t})=>t?c`
          background: #e0517014;
          border-color: ${e.webError._200};
          box-shadow:
            0px 0px 0px 3px rgba(235, 84, 94, 0.12),
            0px 1px 3px 0px rgba(0, 0, 0, 0.1),
            0px 1px 2px 0px rgba(0, 0, 0, 0.06);
        `:``}
`,h=r(d).withConfig({shouldForwardProp:e=>![`hover`,`focus`,`filled`,`error`].includes(e)})`
  width: 40px;
  height: 100%;
  background: ${({theme:e})=>e.webInput._100};
  border-right: 1px solid ${({theme:e})=>e.webNeutral._800};
  align-items: center;
  justify-content: center;
  color: ${({theme:e})=>e.webNeutral._500};

  ${({theme:e,hover:t,focus:n})=>t||n?c`
          border-color: ${e.webNeutral._600};
        `:``}

  ${({theme:e,error:t})=>t?c`
          color: ${e.webError._100};
          background: rgba(224, 81, 112, 0.08);
          border-color: ${e.webError._200};
        `:``}
`,g=r.input.withConfig({shouldForwardProp:e=>![`hover`,`focus`,`filled`,`error`].includes(e)})`
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
`,_=({type:e,index:t,value:n,error:r,onChange:i})=>{let[a,o]=(0,f.useState)(!1),[s,c]=(0,f.useState)(!1),l=(0,f.useMemo)(()=>n.length>0,[n]),u=(0,f.useCallback)(e=>{let t=e.target.value;i(t)},[i]);return(0,p.jsxs)(m,{type:e,hover:a,focus:s,filled:l,error:r,onMouseOver:()=>o(!0),onMouseOut:()=>o(!1),children:[(0,p.jsx)(h,{hover:a,focus:s,filled:l,error:r,children:t}),(0,p.jsx)(g,{hover:a,focus:s,filled:l,value:n,onFocus:()=>c(!0),onBlur:()=>c(!1),onChange:u,error:r})]})},_.__docgenInfo={description:``,methods:[],displayName:`WebSeedInputItem`,props:{type:{required:!0,tsType:{name:`string`},description:``},index:{required:!0,tsType:{name:`number`},description:``},value:{required:!0,tsType:{name:`string`},description:``},error:{required:!0,tsType:{name:`boolean`},description:``},onChange:{required:!0,tsType:{name:`signature`,type:`function`,raw:`(value: string) => void`,signature:{arguments:[{type:{name:`string`},name:`value`}],return:{name:`void`}}},description:``}}}}));export{v as n,_ as t};