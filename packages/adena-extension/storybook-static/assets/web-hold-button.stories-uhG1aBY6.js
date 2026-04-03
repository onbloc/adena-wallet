import{c as e,i as t}from"./_polyfill-node.global-CL4hvcq6.js";import{_ as n,b as r,g as i,rt as a,t as o,v as s}from"./iframe-DekVl-_p.js";import{i as c,n as l,r as u}from"./base-D2xGt4mF.js";import{n as d,t as f}from"./web-text-BdpTg-VM.js";var p,m,h=t((()=>{a(),p=o(),m=()=>(0,p.jsxs)(`svg`,{xmlns:`http://www.w3.org/2000/svg`,width:`14`,height:`14`,viewBox:`0 0 14 14`,fill:`none`,children:[(0,p.jsx)(`path`,{d:`M4.66797 2.33464V9.33464C4.66797 9.64406 4.79089 9.9408 5.00968 10.1596C5.22847 10.3784 5.52522 10.5013 5.83464 10.5013H10.5013C10.8107 10.5013 11.1075 10.3784 11.3263 10.1596C11.5451 9.9408 11.668 9.64406 11.668 9.33464V4.2258C11.6679 4.07038 11.6369 3.91653 11.5766 3.77328C11.5163 3.63003 11.4279 3.50028 11.3168 3.39164L9.38305 1.50047C9.1651 1.28735 8.87239 1.16801 8.56755 1.16797H5.83464C5.52522 1.16797 5.22847 1.29089 5.00968 1.50968C4.79089 1.72847 4.66797 2.02522 4.66797 2.33464Z`,stroke:`#FAFCFF`,strokeWidth:`1.1`,strokeLinecap:`round`,strokeLinejoin:`round`}),(0,p.jsx)(`path`,{d:`M9.33398 10.5007V11.6673C9.33398 11.9767 9.21107 12.2735 8.99228 12.4923C8.77348 12.7111 8.47674 12.834 8.16732 12.834H3.50065C3.19123 12.834 2.89449 12.7111 2.67569 12.4923C2.4569 12.2735 2.33398 11.9767 2.33398 11.6673V5.25065C2.33398 4.94123 2.4569 4.64449 2.67569 4.42569C2.89449 4.2069 3.19123 4.08398 3.50065 4.08398H4.66732`,stroke:`#FAFCFF`,strokeWidth:`1.1`,strokeLinecap:`round`,strokeLinejoin:`round`})]}),m.__docgenInfo={description:``,methods:[],displayName:`IconCopy`}})),g,_,v,y,b,x,S=t((()=>{h(),g=e(a()),n(),c(),d(),_=o(),v=i(l).withConfig({shouldForwardProp:e=>![`clicked`].includes(e)})`
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

  ${({clicked:e})=>e?s`
          background: rgba(255, 255, 255, 0.08);
        `:``}
`,y=3e4,b=2e3,x=({width:e=`fit-content`,height:t=32,copyText:n,clearClipboardTimeout:i=y,onCopy:a})=>{let o=r(),[s,c]=(0,g.useState)(!1),[l,d]=(0,g.useState)(0),[p,h]=(0,g.useState)(!1),x=(0,g.useMemo)(()=>s?`Copied!`:`Copy`,[s]),S=(0,g.useMemo)(()=>p||s,[p,s]),C=(0,g.useCallback)(()=>{s||(c(!0),d(Date.now()),navigator.clipboard.writeText(n),a&&a(),setTimeout(()=>{c(!1)},b))},[s,n,a]),w=(0,g.useCallback)(()=>{h(!0)},[]),T=(0,g.useCallback)(()=>{h(!1)},[]);return(0,g.useEffect)(()=>{console.log(`clear start clipboard`);let e=setTimeout(()=>{console.log(`clear clipboard`),navigator?.clipboard?.writeText(``)},i);return()=>{clearTimeout(e)}},[l,i]),(0,_.jsx)(v,{style:{width:e,height:t},clicked:s,onMouseDown:C,onMouseOver:w,onMouseLeave:T,onMouseOut:T,children:s?(0,_.jsx)(f,{color:S?o.webNeutral._100:o.webNeutral._500,type:`body6`,children:x}):(0,_.jsxs)(g.Fragment,{children:[(0,_.jsx)(u,{children:(0,_.jsx)(m,{})}),(0,_.jsx)(f,{color:S?o.webNeutral._100:o.webNeutral._500,type:`title6`,children:x})]})})},x.__docgenInfo={description:``,methods:[],displayName:`WebCopyButton`,props:{width:{required:!1,tsType:{name:`CSSProperties['width']`,raw:`CSSProperties['width']`},description:``,defaultValue:{value:`'fit-content'`,computed:!1}},height:{required:!1,tsType:{name:`CSSProperties['height']`,raw:`CSSProperties['height']`},description:``,defaultValue:{value:`32`,computed:!1}},copyText:{required:!0,tsType:{name:`string`},description:``},clearClipboardTimeout:{required:!1,tsType:{name:`number`},description:``,defaultValue:{value:`30_000`,computed:!1}},onCopy:{required:!1,tsType:{name:`signature`,type:`function`,raw:`() => void`,signature:{arguments:[],return:{name:`void`}}},description:``}}}})),C,w,T;t((()=>{S(),C={title:`components/atoms/WebCopyButton`,component:x},w={args:{copyText:`123`}},w.parameters={...w.parameters,docs:{...w.parameters?.docs,source:{originalSource:`{
  args: {
    copyText: '123'
  }
}`,...w.parameters?.docs?.source}}},T=[`Default`]}))();export{w as Default,T as __namedExportsOrder,C as default};