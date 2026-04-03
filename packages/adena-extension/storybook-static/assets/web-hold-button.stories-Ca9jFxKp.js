import{c as e,i as t}from"./_polyfill-node.global-CL4hvcq6.js";import{_ as n,b as r,g as i,rt as a,t as o,v as s,y as c}from"./iframe-DekVl-_p.js";import{i as l,r as u}from"./base-D2xGt4mF.js";import{n as d,t as f}from"./web-text-BdpTg-VM.js";var p,m,h,g,_,v=t((()=>{p=e(a()),n(),l(),d(),m=o(),h=c`
  from {
   width: 0;
  }
  to {
   width: 100%;
  }
`,g=i(u)`
  position: relative;
  overflow: hidden;
  display: flex;
  height: 32px;
  padding: 8px 16px;
  justify-content: center;
  align-items: center;
  border-radius: 8px;
  background: transparent;
  cursor: pointer;
  user-select: none;
  box-shadow: 0 0 0 1px #212429 inset;

  ${({pressed:e,finish:t})=>e||t?s`
          box-shadow:
            0 0 0 1px #1e3c71 inset,
            0px 2px 16px 4px rgba(0, 89, 255, 0.24),
            0px 1px 3px 0px rgba(0, 0, 0, 0.1),
            0px 1px 2px 0px rgba(0, 0, 0, 0.06);
          background: ${t?`#0059ff52`:`transparent`};
          ::before {
            content: '';
            z-index: -1;
            position: absolute;
            top: 0px;
            left: 0px;
            height: 100%;
            background: ${t?`transparent`:`#0059ff52`};
            border-radius: 8px;
            animation: ${h} 3s forwards;
            box-shadow: ${t?`none`:`0 0 0 1px #1E3C71 inset`};
          }
        `:s`
          &:hover {
            background: #ffffff14;
            box-shadow: 0 0 0 1px #ffffff14 inset;
          }
        `}
`,_=({width:e=`fit-content`,height:t=32,text:n=`Hold to Reveal`,onFinishHold:i})=>{let a=r(),[o,s]=(0,p.useState)(!1),[c,l]=(0,p.useState)(!1),[u,d]=(0,p.useState)(!1),h=(0,p.useCallback)(()=>{l(!1),o&&s(!1)},[o]),_=(0,p.useCallback)(()=>{if(u){d(!1);return}l(!0),s(!0)},[u,h]),v=(0,p.useCallback)(()=>{l(!0)},[]),y=(0,p.useCallback)(()=>{h()},[h]),b=(0,p.useCallback)(()=>{h()},[h]);return(0,p.useEffect)(()=>{i(u)},[u]),(0,p.useEffect)(()=>{let e;return o&&(e=setTimeout(()=>{d(!0)},3e3)),()=>{clearTimeout(e)}},[o,i]),(0,m.jsx)(g,{style:{width:e,height:t},pressed:o,finish:u,onMouseDown:_,onMouseUp:y,onMouseOver:v,onMouseLeave:b,onMouseOut:b,children:(0,m.jsx)(f,{color:c||u?a.webNeutral._100:a.webNeutral._500,type:`title6`,children:n})})},_.__docgenInfo={description:``,methods:[],displayName:`WebHoldButton`,props:{width:{required:!1,tsType:{name:`CSSProperties['width']`,raw:`CSSProperties['width']`},description:``,defaultValue:{value:`'fit-content'`,computed:!1}},height:{required:!1,tsType:{name:`CSSProperties['height']`,raw:`CSSProperties['height']`},description:``,defaultValue:{value:`32`,computed:!1}},text:{required:!1,tsType:{name:`string`},description:``,defaultValue:{value:`'Hold to Reveal'`,computed:!1}},onFinishHold:{required:!0,tsType:{name:`signature`,type:`function`,raw:`(result: boolean) => void`,signature:{arguments:[{type:{name:`boolean`},name:`result`}],return:{name:`void`}}},description:``}}}})),y,b,x,S;t((()=>{v(),{action:y}=__STORYBOOK_MODULE_ACTIONS__,b={title:`components/atoms/WebHoldButton`,component:_},x={args:{onFinishHold:y(`onFinishHold`)}},x.parameters={...x.parameters,docs:{...x.parameters?.docs,source:{originalSource:`{
  args: {
    onFinishHold: action('onFinishHold')
  }
}`,...x.parameters?.docs?.source}}},S=[`Default`]}))();export{x as Default,S as __namedExportsOrder,b as default};