import{j as n}from"./global-style-Be4sOX77.js";import{r as t,l as y,d as g}from"./theme-D2qI5cuM.js";import{V as b}from"./index-CLRA8FOO.js";import{W as d}from"./index-jlviZXHb.js";import"./index-BAMY2Nnw.js";const x=g(b)`
  width: fit-content;
  height: ${({height:e})=>e?`${e}px`:"1em"};
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

  ${({active:e})=>e?y`
          & > * {
            animation: rolling-animation 0.2s linear forwards;
          }
        `:""}
`,u=({height:e,value:r,type:a,color:i,style:m,textCenter:l})=>{const[p,f]=t.useState(r),[o,c]=t.useState(!1);return t.useEffect(()=>{p!==r&&c(!0)},[r]),t.useEffect(()=>{o&&setTimeout(()=>{c(!1),f(r)},200)},[o]),n.jsxs(x,{active:o,height:e,children:[n.jsx(d,{type:a,color:i,style:m,textCenter:l,children:p}),n.jsx(d,{type:a,color:i,style:m,textCenter:l,children:r})]})};u.__docgenInfo={description:"",methods:[],displayName:"RollingNumber",props:{value:{required:!0,tsType:{name:"number"},description:""},height:{required:!1,tsType:{name:"number"},description:""},type:{required:!0,tsType:{name:"WebFontType"},description:""},color:{required:!1,tsType:{name:"string"},description:""},style:{required:!1,tsType:{name:"ReactCSSProperties",raw:"React.CSSProperties"},description:""},textCenter:{required:!1,tsType:{name:"boolean"},description:""}}};const j={title:"components/atoms/RollingNumber",component:u},s={args:{value:3,type:"body6",color:"#FBC224"}};s.parameters={...s.parameters,docs:{...s.parameters?.docs,source:{originalSource:`{
  args: {
    value: 3,
    type: 'body6',
    color: '#FBC224'
  }
}`,...s.parameters?.docs?.source}}};const w=["Default"];export{s as Default,w as __namedExportsOrder,j as default};
