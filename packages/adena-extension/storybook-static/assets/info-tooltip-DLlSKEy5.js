import{j as e,m as j}from"./global-style-Be4sOX77.js";import{d as m,f as k,g as u,r as n}from"./theme-D2qI5cuM.js";const T=({className:t,color:i="#777777"})=>e.jsxs("svg",{className:t,width:"13",height:"13",viewBox:"0 0 13 13",fill:"none",xmlns:"http://www.w3.org/2000/svg",children:[e.jsx("path",{d:"M6.5 7.25879V8.77603",stroke:i,strokeWidth:"2",strokeLinecap:"round",strokeLinejoin:"round"}),e.jsx("path",{d:"M6.87972 4.22404C6.87972 4.43352 6.70989 4.60335 6.5004 4.60335C6.29092 4.60335 6.12109 4.43352 6.12109 4.22404C6.12109 4.01455 6.29092 3.84473 6.5004 3.84473C6.70989 3.84473 6.87972 4.01455 6.87972 4.22404Z",stroke:i}),e.jsx("path",{d:"M12 6.5C12 9.53757 9.53757 12 6.5 12C3.46243 12 1 9.53757 1 6.5C1 3.46243 3.46243 1 6.5 1C9.53757 1 12 3.46243 12 6.5Z",stroke:i,strokeWidth:"1.5",strokeLinecap:"round",strokeLinejoin:"round"})]});T.__docgenInfo={description:"",methods:[],displayName:"IconHelp",props:{className:{required:!1,tsType:{name:"string"},description:""},color:{required:!1,tsType:{name:"string"},description:"",defaultValue:{value:"'#777777'",computed:!1}}}};const I=m.div`
  position: relative;
  ${j.flex({direction:"row"})};
  cursor: pointer;
`,N=m.div`
  position: ${({$position:t})=>t?.left!==void 0?"fixed":"absolute"};
  bottom: ${({$position:t})=>t?.left!==void 0?"auto":"calc(100% + 14px)"};
  top: ${({$position:t})=>t?.top!==void 0?`${t.top}px`:"auto"};
  left: ${({$position:t})=>t?.left!==void 0?`${t.left}px`:"50%"};
  right: ${({$position:t})=>t?.right!==void 0?`${t.right}px`:"auto"};
  transform: ${({$position:t})=>t?.transform||"translate(-50%, -100%)"};
  background-color: ${u("neutral","_8")};
  width: 300px;
  height: auto;
  border-radius: 8px;
  padding: 16px;
  color: ${u("neutral","_2")};
  ${k.body2Reg};
  cursor: default;
  z-index: 9999;

  &::after {
    content: '';
    position: absolute;
    bottom: -14px;
    left: ${({$arrowPosition:t})=>t?.left||"50%"};
    transform: ${({$arrowPosition:t})=>t?.transform||"translateX(-50%)"};
    width: 0;
    height: 0;
    border-left: 12.5px solid transparent;
    border-right: 12.5px solid transparent;
    border-top: 14px solid ${u("neutral","_8")};
    border-radius: 0 0 4px 4px;
  }
`,y=({content:t,iconColor:i})=>{const[c,x]=n.useState(!1),[g,w]=n.useState({}),[v,R]=n.useState({left:"50%",transform:"translateX(-50%)"}),a=n.useRef(null),d=n.useRef(null);n.useEffect(()=>{c&&a.current&&d.current&&$()},[c]);const $=()=>{if(!a.current||!d.current)return;const f=a.current.getBoundingClientRect(),h=window.innerWidth,r=300,l=8,p=f.left+f.width/2,C=f.top;let o=p-r/2,s=(p-o)/r*100;o<l?(o=l,s=(p-o)/r*100):o+r>h-l&&(o=h-r-l,s=(p-o)/r*100),s=Math.max(8,Math.min(92,s)),w({left:o,top:C-14,transform:"translateY(-100%)"}),R({left:`${s}%`,transform:"translateX(-50%)"})};return e.jsxs(I,{ref:a,onMouseOver:()=>x(!0),onMouseLeave:()=>x(!1),children:[e.jsx(T,{color:i}),c&&e.jsx(N,{ref:d,$position:g,$arrowPosition:v,children:t})]})};y.__docgenInfo={description:"",methods:[],displayName:"InfoTooltip",props:{content:{required:!0,tsType:{name:"ReactReactNode",raw:"React.ReactNode"},description:""},iconColor:{required:!1,tsType:{name:"string"},description:""}}};export{y as I};
