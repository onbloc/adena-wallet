import{n as e,o as t}from"./chunk-zsgVPwQN.js";import{_ as n,g as r,rt as i,t as a,v as o}from"./iframe-BclzClxJ.js";import{i as s,r as c}from"./base-Cfud_vLb.js";import{n as l,t as u}from"./web-text-Bx7m5W80.js";var d,f,p,m,h=e((()=>{d=t(i()),n(),s(),l(),f=a(),p=r(c)`
  width: fit-content;
  height: ${({height:e})=>e?`${e}px`:`1em`};
  flex-direction: column;
  overflow: hidden;

  @keyframes rolling-animation {
    from {
      transform: translate(0, 0);
    }

    to {
      transform: translate(0, -100%);
    }
  }

  ${({active:e})=>e?o`
          & > * {
            animation: rolling-animation 0.2s linear forwards;
          }
        `:``}
`,m=({height:e,value:t,type:n,color:r,style:i,textCenter:a})=>{let[o,s]=(0,d.useState)(t),[c,l]=(0,d.useState)(!1);return(0,d.useEffect)(()=>{o!==t&&l(!0)},[t]),(0,d.useEffect)(()=>{c&&setTimeout(()=>{l(!1),s(t)},200)},[c]),(0,f.jsxs)(p,{active:c,height:e,children:[(0,f.jsx)(u,{type:n,color:r,style:i,textCenter:a,children:o}),(0,f.jsx)(u,{type:n,color:r,style:i,textCenter:a,children:t})]})},m.__docgenInfo={description:``,methods:[],displayName:`RollingNumber`,props:{value:{required:!0,tsType:{name:`number`},description:``},height:{required:!1,tsType:{name:`number`},description:``},type:{required:!0,tsType:{name:`WebFontType`},description:``},color:{required:!1,tsType:{name:`string`},description:``},style:{required:!1,tsType:{name:`ReactCSSProperties`,raw:`React.CSSProperties`},description:``},textCenter:{required:!1,tsType:{name:`boolean`},description:``}}}})),g,_,v;e((()=>{h(),g={title:`components/atoms/RollingNumber`,component:m},_={args:{value:3,type:`body6`,color:`#FBC224`}},_.parameters={..._.parameters,docs:{..._.parameters?.docs,source:{originalSource:`{
  args: {
    value: 3,
    type: 'body6',
    color: '#FBC224'
  }
}`,..._.parameters?.docs?.source}}},v=[`Default`]}))();export{_ as Default,v as __namedExportsOrder,g as default};