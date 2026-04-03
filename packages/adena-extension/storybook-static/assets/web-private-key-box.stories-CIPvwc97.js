import{n as e,o as t}from"./chunk-zsgVPwQN.js";import{_ as n,g as r,rt as i,t as a}from"./iframe-BclzClxJ.js";import{t as o}from"./atoms-kch4SvDy.js";import{r as s}from"./base-Cfud_vLb.js";import{n as c,t as l}from"./web-textarea-BxqGm0Im.js";import{t as u}from"./__vite-browser-external-B_CqYv81.js";import{n as d,t as f}from"./encoding-util-4L8qDxO1.js";function p(){return m.default.randomBytes(32).toString(`hex`)}var m,h=e((()=>{m=t(u())})),g,_,v,y,b,x=e((()=>{f(),h(),c(),g=t(i()),n(),o(),_=a(),v=r(s)`
  position: relative;
  overflow: hidden;
  height: 80px;
`,y=r(s)`
  position: absolute;
  width: 100%;
  height: 100%;
  z-index: 1;
  background-color: #0000000a;
  backdrop-filter: blur(4px);
  border-radius: 10px;
`,b=({privateKey:e,showBlur:t=!0,readOnly:n=!1,error:r=!1})=>{let i=p(),[a,o]=(0,g.useState)(i);return(0,g.useEffect)(()=>{if(!t){o(d(e));return}o(i)},[t,e]),(0,g.useEffect)(()=>()=>{o(``)},[]),(0,_.jsxs)(v,{showBlur:t,children:[(0,_.jsx)(l,{value:a,placeholder:`Private Key`,readOnly:n,error:r,style:{height:`100%`},onChange:()=>{},spellCheck:!1}),t&&(0,_.jsx)(y,{})]})},b.__docgenInfo={description:``,methods:[],displayName:`WebPrivateKeyBox`,props:{privateKey:{required:!0,tsType:{name:`string`},description:``},showBlur:{required:!1,tsType:{name:`boolean`},description:``,defaultValue:{value:`true`,computed:!1}},readOnly:{required:!1,tsType:{name:`boolean`},description:``,defaultValue:{value:`false`,computed:!1}},error:{required:!1,tsType:{name:`boolean`},description:``,defaultValue:{value:`false`,computed:!1}}}}})),S,C,w;e((()=>{x(),S={title:`components/molecules/WebPrivateKeyBox`,component:b},C={args:{privateKey:`privateKey`,showBlur:!0}},C.parameters={...C.parameters,docs:{...C.parameters?.docs,source:{originalSource:`{
  args: {
    privateKey: 'privateKey',
    showBlur: true
  }
}`,...C.parameters?.docs?.source}}},w=[`Default`]}))();export{C as Default,w as __namedExportsOrder,S as default};