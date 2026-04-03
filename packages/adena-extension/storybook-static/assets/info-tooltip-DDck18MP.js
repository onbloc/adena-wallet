import{n as e,o as t}from"./chunk-zsgVPwQN.js";import{_ as n,c as r,g as i,i as a,n as o,r as s,rt as c,s as l,t as u}from"./iframe-BclzClxJ.js";var d,f,p=e((()=>{c(),d=u(),f=({className:e,color:t=`#777777`})=>(0,d.jsxs)(`svg`,{className:e,width:`13`,height:`13`,viewBox:`0 0 13 13`,fill:`none`,xmlns:`http://www.w3.org/2000/svg`,children:[(0,d.jsx)(`path`,{d:`M6.5 7.25879V8.77603`,stroke:t,strokeWidth:`2`,strokeLinecap:`round`,strokeLinejoin:`round`}),(0,d.jsx)(`path`,{d:`M6.87972 4.22404C6.87972 4.43352 6.70989 4.60335 6.5004 4.60335C6.29092 4.60335 6.12109 4.43352 6.12109 4.22404C6.12109 4.01455 6.29092 3.84473 6.5004 3.84473C6.70989 3.84473 6.87972 4.01455 6.87972 4.22404Z`,stroke:t}),(0,d.jsx)(`path`,{d:`M12 6.5C12 9.53757 9.53757 12 6.5 12C3.46243 12 1 9.53757 1 6.5C1 3.46243 3.46243 1 6.5 1C9.53757 1 12 3.46243 12 6.5Z`,stroke:t,strokeWidth:`1.5`,strokeLinecap:`round`,strokeLinejoin:`round`})]}),f.__docgenInfo={description:``,methods:[],displayName:`IconHelp`,props:{className:{required:!1,tsType:{name:`string`},description:``},color:{required:!1,tsType:{name:`string`},description:``,defaultValue:{value:`'#777777'`,computed:!1}}}}})),m,h,g=e((()=>{l(),a(),n(),m=i.div`
  position: relative;
  ${r.flex({direction:`row`})};
  cursor: pointer;
`,h=i.div`
  position: ${({$position:e})=>e?.left===void 0?`absolute`:`fixed`};
  bottom: ${({$position:e})=>e?.left===void 0?`calc(100% + 14px)`:`auto`};
  top: ${({$position:e})=>e?.top===void 0?`auto`:`${e.top}px`};
  left: ${({$position:e})=>e?.left===void 0?`50%`:`${e.left}px`};
  right: ${({$position:e})=>e?.right===void 0?`auto`:`${e.right}px`};
  transform: ${({$position:e})=>e?.transform||`translate(-50%, -100%)`};
  background-color: ${s(`neutral`,`_8`)};
  width: 300px;
  height: auto;
  border-radius: 8px;
  padding: 16px;
  color: ${s(`neutral`,`_2`)};
  ${o.body2Reg};
  cursor: default;
  z-index: 9999;

  &::after {
    content: '';
    position: absolute;
    bottom: -14px;
    left: ${({$arrowPosition:e})=>e?.left||`50%`};
    transform: ${({$arrowPosition:e})=>e?.transform||`translateX(-50%)`};
    width: 0;
    height: 0;
    border-left: 12.5px solid transparent;
    border-right: 12.5px solid transparent;
    border-top: 14px solid ${s(`neutral`,`_8`)};
    border-radius: 0 0 4px 4px;
  }
`})),_,v,y,b=e((()=>{p(),_=t(c()),g(),v=u(),y=({content:e,iconColor:t})=>{let[n,r]=(0,_.useState)(!1),[i,a]=(0,_.useState)({}),[o,s]=(0,_.useState)({left:`50%`,transform:`translateX(-50%)`}),c=(0,_.useRef)(null),l=(0,_.useRef)(null);(0,_.useEffect)(()=>{n&&c.current&&l.current&&u()},[n]);let u=()=>{if(!c.current||!l.current)return;let e=c.current.getBoundingClientRect(),t=window.innerWidth,n=e.left+e.width/2,r=e.top,i=n-300/2,o=(n-i)/300*100;i<8?(i=8,o=(n-i)/300*100):i+300>t-8&&(i=t-300-8,o=(n-i)/300*100),o=Math.max(8,Math.min(92,o)),a({left:i,top:r-14,transform:`translateY(-100%)`}),s({left:`${o}%`,transform:`translateX(-50%)`})};return(0,v.jsxs)(m,{ref:c,onMouseOver:()=>r(!0),onMouseLeave:()=>r(!1),children:[(0,v.jsx)(f,{color:t}),n&&(0,v.jsx)(h,{ref:l,$position:i,$arrowPosition:o,children:e})]})},y.__docgenInfo={description:``,methods:[],displayName:`InfoTooltip`,props:{content:{required:!0,tsType:{name:`ReactReactNode`,raw:`React.ReactNode`},description:``},iconColor:{required:!1,tsType:{name:`string`},description:``}}}}));export{b as n,y as t};