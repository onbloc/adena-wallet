import{n as e,o as t}from"./chunk-zsgVPwQN.js";import{_ as n,b as r,g as i,rt as a,t as o}from"./iframe-BclzClxJ.js";import{t as s}from"./atoms-kch4SvDy.js";import{n as c,r as l,t as u}from"./base-Cfud_vLb.js";import{t as d}from"./web-img-D8LTiWQ_.js";import{t as f}from"./lodash-D3AOhKZn.js";import{n as p,t as m}from"./chevron-left-HAmv4SFd.js";var h,g,_,v,y,b,x,S=e((()=>{p(),s(),h=t(f()),g=t(a()),n(),_=o(),v=i(c)`
  width: 100%;
  justify-content: space-between;
  padding-bottom: 16px;
`,y=i(l)`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: ${({theme:e,selected:t})=>t?e.webPrimary._100:`rgba(0, 89, 255, 0.32)`};
`,b=i(l)`
  width: 32px;
`,x=({onClickGoBack:e,currentStep:t,stepLength:n})=>{let i=r(),a=(0,g.useMemo)(()=>t&&t>-1,[t]);return(0,_.jsxs)(v,{children:[(0,_.jsx)(u,{onClick:e,style:{padding:4,backgroundColor:i.webInput._100,borderRadius:16},children:(0,_.jsx)(d,{src:m,size:24})}),(0,_.jsx)(c,{style:{columnGap:8},children:n>1&&a&&(0,_.jsx)(g.Fragment,{children:h.default.times(n,e=>(0,_.jsx)(y,{selected:e===t},e))})}),(0,_.jsx)(b,{})]})},x.__docgenInfo={description:``,methods:[],displayName:`WebMainHeader`,props:{stepLength:{required:!0,tsType:{name:`number`},description:``},onClickGoBack:{required:!0,tsType:{name:`signature`,type:`function`,raw:`() => void`,signature:{arguments:[],return:{name:`void`}}},description:``},currentStep:{required:!1,tsType:{name:`number`},description:``}}}})),C,w,T,E;e((()=>{S(),{action:C}=__STORYBOOK_MODULE_ACTIONS__,w={title:`components/pages/WebMainHeader`,component:x},T={args:{currentStep:1,stepLength:4,onClickGoBack:C(`click back`)}},T.parameters={...T.parameters,docs:{...T.parameters?.docs,source:{originalSource:`{
  args: {
    currentStep: 1,
    stepLength: 4,
    onClickGoBack: action('click back')
  }
}`,...T.parameters?.docs?.source}}},E=[`Default`]}))();export{T as Default,E as __namedExportsOrder,w as default};