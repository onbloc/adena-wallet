import{n as e,o as t}from"./chunk-zsgVPwQN.js";import{_ as n,g as r,i,n as a,rt as o,t as s}from"./iframe-BclzClxJ.js";import{t as c}from"./atoms-kch4SvDy.js";import{r as l}from"./base-Cfud_vLb.js";var u,d,f=e((()=>{c(),i(),n(),u=r(l)`
  position: absolute;
  width: 0;
  height: auto;
  top: 40px;
  left: 50%;
  z-index: 97;
  justify-content: center;
  align-items: center;
  opacity: 0;
  transition: 0.5s;
  pointer-events: none;

  &.active {
    opacity: 1;
  }
`,d=r(l)`
  width: fit-content;
  flex-shrink: 0;
  padding: 2px 16px;
  color: #fff;
  border-radius: 12.5px;
  background-color: ${({theme:e})=>e.neutral._9};
  ${a.body2Reg}
  white-space: nowrap;
  pointer-events: none;
`})),p,m,h,g=e((()=>{p=t(o()),f(),m=s(),h=({text:e,onFinish:t})=>{let[n,r]=(0,p.useState)(!1);return(0,p.useEffect)(()=>{r(!0)},[e]),(0,p.useEffect)(()=>{if(!n){let e=setTimeout(t,1e3);return()=>{clearTimeout(e)}}},[n]),(0,p.useEffect)(()=>{if(n){let e=setTimeout(()=>{r(!1)},3*1e3);return()=>{clearTimeout(e)}}},[n,e]),(0,m.jsx)(u,{className:n?`active`:``,children:(0,m.jsx)(d,{children:e})})},h.__docgenInfo={description:``,methods:[],displayName:`Toast`,props:{text:{required:!0,tsType:{name:`string`},description:``},onFinish:{required:!0,tsType:{name:`signature`,type:`function`,raw:`() => void`,signature:{arguments:[],return:{name:`void`}}},description:``}}}})),_,v,y,b;e((()=>{g(),{action:_}=__STORYBOOK_MODULE_ACTIONS__,v={title:`components/atoms/Toast`,component:h},y={args:{text:`Tokens successfully received!`,onFinish:_(`onFinish`)}},y.parameters={...y.parameters,docs:{...y.parameters?.docs,source:{originalSource:`{
  args: {
    text: 'Tokens successfully received!',
    onFinish: action('onFinish')
  }
}`,...y.parameters?.docs?.source}}},b=[`Default`]}))();export{y as Default,b as __namedExportsOrder,v as default};