import{j as o}from"./global-style-Be4sOX77.js";import{n as T,r as t,R as _,l as S,d as j}from"./theme-D2qI5cuM.js";import{V as M,R as F}from"./index-CLRA8FOO.js";import{W as f}from"./index-jlviZXHb.js";import"./index-BAMY2Nnw.js";const g=()=>o.jsxs("svg",{xmlns:"http://www.w3.org/2000/svg",width:"14",height:"14",viewBox:"0 0 14 14",fill:"none",children:[o.jsx("path",{d:"M4.66797 2.33464V9.33464C4.66797 9.64406 4.79089 9.9408 5.00968 10.1596C5.22847 10.3784 5.52522 10.5013 5.83464 10.5013H10.5013C10.8107 10.5013 11.1075 10.3784 11.3263 10.1596C11.5451 9.9408 11.668 9.64406 11.668 9.33464V4.2258C11.6679 4.07038 11.6369 3.91653 11.5766 3.77328C11.5163 3.63003 11.4279 3.50028 11.3168 3.39164L9.38305 1.50047C9.1651 1.28735 8.87239 1.16801 8.56755 1.16797H5.83464C5.52522 1.16797 5.22847 1.29089 5.00968 1.50968C4.79089 1.72847 4.66797 2.02522 4.66797 2.33464Z",stroke:"#FAFCFF",strokeWidth:"1.1",strokeLinecap:"round",strokeLinejoin:"round"}),o.jsx("path",{d:"M9.33398 10.5007V11.6673C9.33398 11.9767 9.21107 12.2735 8.99228 12.4923C8.77348 12.7111 8.47674 12.834 8.16732 12.834H3.50065C3.19123 12.834 2.89449 12.7111 2.67569 12.4923C2.4569 12.2735 2.33398 11.9767 2.33398 11.6673V5.25065C2.33398 4.94123 2.4569 4.64449 2.67569 4.42569C2.89449 4.2069 3.19123 4.08398 3.50065 4.08398H4.66732",stroke:"#FAFCFF",strokeWidth:"1.1",strokeLinecap:"round",strokeLinejoin:"round"})]});g.__docgenInfo={description:"",methods:[],displayName:"IconCopy"};const L=j(F).withConfig({shouldForwardProp:e=>!["clicked"].includes(e)})`
  display: flex;
  padding: 0 14px 0 14px;
  gap: 4px;
  justify-content: center;
  align-items: center;
  border-radius: 8px;
  border: 1px solid #212429;
  background: transparent;
  cursor: pointer;
  user-select: none;

  svg {
    width: 16px;
    height: 16px;
  }

  svg * {
    stroke: ${({theme:e})=>e.webNeutral._500};
  }

  &:hover {
    background: rgba(255, 255, 255, 0.08);
    svg * {
      stroke: ${({theme:e})=>e.webNeutral._100};
    }
  }

  ${({clicked:e})=>e?S`
          background: rgba(255, 255, 255, 0.08);
        `:""}
`,I=3e4,O=2e3,h=({width:e="fit-content",height:x=32,copyText:i,clearClipboardTimeout:c=I,onCopy:a})=>{const s=T(),[r,u]=t.useState(!1),[b,w]=t.useState(0),[d,l]=t.useState(!1),p=t.useMemo(()=>r?"Copied!":"Copy",[r]),m=t.useMemo(()=>d||r,[d,r]),y=t.useCallback(()=>{r||(u(!0),w(Date.now()),navigator.clipboard.writeText(i),a&&a(),setTimeout(()=>{u(!1)},O))},[r,i,a]),k=t.useCallback(()=>{l(!0)},[]),C=t.useCallback(()=>{l(!1)},[]);return t.useEffect(()=>{console.log("clear start clipboard");const v=setTimeout(()=>{console.log("clear clipboard"),navigator?.clipboard?.writeText("")},c);return()=>{clearTimeout(v)}},[b,c]),o.jsx(L,{style:{width:e,height:x},clicked:r,onMouseDown:y,onMouseOver:k,onMouseLeave:C,onMouseOut:C,children:r?o.jsx(f,{color:m?s.webNeutral._100:s.webNeutral._500,type:"body6",children:p}):o.jsxs(_.Fragment,{children:[o.jsx(M,{children:o.jsx(g,{})}),o.jsx(f,{color:m?s.webNeutral._100:s.webNeutral._500,type:"title6",children:p})]})})};h.__docgenInfo={description:"",methods:[],displayName:"WebCopyButton",props:{width:{required:!1,tsType:{name:"CSSProperties['width']",raw:"CSSProperties['width']"},description:"",defaultValue:{value:"'fit-content'",computed:!1}},height:{required:!1,tsType:{name:"CSSProperties['height']",raw:"CSSProperties['height']"},description:"",defaultValue:{value:"32",computed:!1}},copyText:{required:!0,tsType:{name:"string"},description:""},clearClipboardTimeout:{required:!1,tsType:{name:"number"},description:"",defaultValue:{value:"30_000",computed:!1}},onCopy:{required:!1,tsType:{name:"signature",type:"function",raw:"() => void",signature:{arguments:[],return:{name:"void"}}},description:""}}};const R={title:"components/atoms/WebCopyButton",component:h},n={args:{copyText:"123"}};n.parameters={...n.parameters,docs:{...n.parameters?.docs,source:{originalSource:`{
  args: {
    copyText: '123'
  }
}`,...n.parameters?.docs?.source}}};const W=["Default"];export{n as Default,W as __namedExportsOrder,R as default};
