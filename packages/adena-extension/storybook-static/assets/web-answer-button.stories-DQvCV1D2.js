import{i as e}from"./_polyfill-node.global-CL4hvcq6.js";import{_ as t,g as n,i as r,o as i,r as a,rt as o,t as s,v as c}from"./iframe-DekVl-_p.js";import{t as l}from"./atoms-DPNcwsZr.js";import{t as u}from"./base-D2xGt4mF.js";var d,f,p,m=e((()=>{l(),r(),t(),d=n(u)`
  width: 100%;
  height: 44px;
  padding: 16px;
  align-items: flex-start;
  justify-content: center;
  color: ${a(`webNeutral`,`_200`)};
  border-radius: 10px;
  border: 1px solid ${a(`webNeutral`,`_800`)};
  background-color: transparent;
  transition: 0.2s;
  ${i.body4}

  ${({selected:e})=>e===!1?c`
          &:hover {
            background-color: rgba(255, 255, 255, 0.04);
          }
        `:``}
`,f=n(d)`
  ${({theme:e,selected:t})=>t?c`
          cursor: default;
          color: ${e.webSuccess._100};
          border-color: ${e.webSuccess._200};
          background-color: ${e.webSuccess._300};
        `:``}
`,p=n(d)`
  ${({theme:e,selected:t})=>t?c`
          cursor: default;
          color: ${e.webError._100};
          border-color: ${e.webError._200};
          background-color: ${e.webError._300};
        `:``}
`})),h,g,_=e((()=>{o(),m(),h=s(),g=({answer:e,correct:t,selected:n,onClick:r})=>t?(0,h.jsx)(f,{selected:n,onClick:r,children:e}):(0,h.jsx)(p,{selected:n,onClick:r,children:e}),g.__docgenInfo={description:``,methods:[],displayName:`WebAnswerButton`,props:{answer:{required:!0,tsType:{name:`string`},description:``},correct:{required:!0,tsType:{name:`boolean`},description:``},selected:{required:!0,tsType:{name:`boolean`},description:``},onClick:{required:!0,tsType:{name:`signature`,type:`function`,raw:`() => void`,signature:{arguments:[],return:{name:`void`}}},description:``}}}})),v,y,b,x;e((()=>{_(),{action:v}=__STORYBOOK_MODULE_ACTIONS__,y={title:`components/molecules/WebAnswerButton`,component:g},b={args:{correct:!0,selected:!1,answer:`answer`,onClick:v(`click answer`)}},b.parameters={...b.parameters,docs:{...b.parameters?.docs,source:{originalSource:`{
  args: {
    correct: true,
    selected: false,
    answer: 'answer',
    onClick: action('click answer')
  }
}`,...b.parameters?.docs?.source}}},x=[`Default`]}))();export{b as Default,x as __namedExportsOrder,y as default};