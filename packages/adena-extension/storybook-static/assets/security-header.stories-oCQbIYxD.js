import{c as e,i as t}from"./_polyfill-node.global-CL4hvcq6.js";import{_ as n,b as r,g as i,rt as a,t as o}from"./iframe-DekVl-_p.js";import{t as s}from"./atoms-DPNcwsZr.js";import{n as c,r as l,t as u}from"./base-D2xGt4mF.js";import{t as d}from"./web-img-BKM2YUA3.js";import{t as f}from"./lodash-Cj8hxz_R.js";import{n as p,t as m}from"./chevron-left-C6Zzm625.js";var h,g,_,v,y,b,x=t((()=>{p(),s(),h=e(f()),a(),n(),g=o(),_=i(c)`
  width: 100%;
  height: 32px;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
`,v=i(l)`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: ${({theme:e,selected:t})=>t?e.webPrimary._100:`rgba(0, 89, 255, 0.32)`};
`,y=i(l)`
  width: 24px;
`,b=({currentStep:e,stepLength:t,visibleBackButton:n,onClickGoBack:i})=>{let a=r();return(0,g.jsxs)(_,{children:[n?(0,g.jsx)(u,{onClick:i,style:{padding:4,backgroundColor:a.webInput._100,borderRadius:16},children:(0,g.jsx)(d,{src:m,size:24})}):(0,g.jsx)(y,{}),t>0&&(0,g.jsx)(c,{style:{columnGap:8},children:h.default.times(t,t=>(0,g.jsx)(v,{selected:t===e},t))}),(0,g.jsx)(y,{})]})},b.__docgenInfo={description:``,methods:[],displayName:`WebSecurityHeader`,props:{currentStep:{required:!1,tsType:{name:`number`},description:``},stepLength:{required:!0,tsType:{name:`number`},description:``},visibleBackButton:{required:!0,tsType:{name:`boolean`},description:``},onClickGoBack:{required:!0,tsType:{name:`signature`,type:`function`,raw:`() => void`,signature:{arguments:[],return:{name:`void`}}},description:``}}}})),S,C,w,T;t((()=>{x(),{action:S}=__STORYBOOK_MODULE_ACTIONS__,C={title:`components/pages/WebSecurityHeader`,component:b},w={args:{currentStep:0,stepLength:2,visibleBackButton:!0,onClickGoBack:S(`click back`)}},w.parameters={...w.parameters,docs:{...w.parameters?.docs,source:{originalSource:`{
  args: {
    currentStep: 0,
    stepLength: 2,
    visibleBackButton: true,
    onClickGoBack: action('click back')
  }
}`,...w.parameters?.docs?.source}}},T=[`Default`]}))();export{w as Default,T as __namedExportsOrder,C as default};