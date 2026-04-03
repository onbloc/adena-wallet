import{m as c,j as t,r as O}from"./global-style-Be4sOX77.js";import{a as G,A as U}from"./index-CulhM7-u.js";import{d as a,l,g as i,r as u,n as j,f as v,m as f,R as K,w as z}from"./theme-D2qI5cuM.js";import{R as Y,V as X}from"./index-CLRA8FOO.js";import"./index-DrT1707K.js";import"./index-DjFTnIrN.js";import"./index-DacC881Y.js";import"./index-BxhAeZbh.js";import"./index-CpLq81TF.js";import"./index-Bv2zqv-E.js";import"./index-g6zNktBg.js";import"./index-B3tmVslE.js";import"./index-C6Pb5J-W.js";import"./index-C0j4FPrl.js";import"./index-jlviZXHb.js";const J="data:image/svg+xml,%3csvg%20width='24'%20height='24'%20viewBox='0%200%2024%2024'%20fill='none'%20xmlns='http://www.w3.org/2000/svg'%3e%3cpath%20d='M4%208L12%2017L20%208'%20stroke='white'%20strokeWidth='2'%20strokeLinecap='round'%20strokeLinejoin='round'/%3e%3c/svg%3e",Q="data:image/svg+xml,%3csvg%20width='24'%20height='24'%20viewBox='0%200%2024%2024'%20fill='none'%20xmlns='http://www.w3.org/2000/svg'%3e%3cpath%20d='M20%2016L12%207L4%2016'%20stroke='white'%20strokeWidth='2'%20strokeLinecap='round'%20strokeLinejoin='round'/%3e%3c/svg%3e",b=a.button`
  width: 24px;
  height: 24px;
  background-repeat: no-repeat;
  background-position: center center;
`,pt=a(b)`
  background-image: url(${G});
`;a(b)`
  background-image: url(${U});
`;a(b)`
  background-image: url(${Q});
`;a(b)`
  background-image: url(${J});
`;const ee="data:image/svg+xml,%3csvg%20width='308'%20height='128'%20viewBox='0%200%20308%20128'%20fill='none'%20xmlns='http://www.w3.org/2000/svg'%3e%3cg%20filter='url(%23filter0_b_5399_111731)'%3e%3crect%20width='308'%20height='128'%20rx='18'%20fill='%23191920'%20fill-opacity='0.3'/%3e%3c/g%3e%3cdefs%3e%3cfilter%20id='filter0_b_5399_111731'%20x='-8'%20y='-8'%20width='324'%20height='144'%20filterUnits='userSpaceOnUse'%20color-interpolation-filters='sRGB'%3e%3cfeFlood%20flood-opacity='0'%20result='BackgroundImageFix'/%3e%3cfeGaussianBlur%20in='BackgroundImageFix'%20stdDeviation='4'/%3e%3cfeComposite%20in2='SourceAlpha'%20operator='in'%20result='effect1_backgroundBlur_5399_111731'/%3e%3cfeBlend%20mode='normal'%20in='SourceGraphic'%20in2='effect1_backgroundBlur_5399_111731'%20result='shape'/%3e%3c/filter%3e%3c/defs%3e%3c/svg%3e";a.div`
  ${c.flex()};
  ${c.positionCenter()};
  gap: ${({hasText:e})=>e&&"21px"};
  background: url(${ee}) no-repeat 100% 100% / 100% 100%;
  width: calc(100% - 12px);
  height: calc(100% - 12px);
  z-index: 10;
  backdrop-filter: blur(4px);
  border-radius: 18px;
  svg {
    width: 24px;
    height: 20px;
  }
`;const x={normal:l`
    background: ${i("neutral","_7")};
    &:hover {
      background: ${i("neutral","b")};
    }
    /* &:disabled {
      background: ${i("primary","_9")};
      color: ${i("neutral","_5")};
    } */
  `,primary:l`
    background: ${i("primary","_6")};
    &:hover {
      background: ${i("primary","_7")};
    }
    &:disabled {
      background: ${i("primary","_9")};
      color: ${i("neutral","_5")};
    }
  `,ghost:l`
    background: ${i("neutral","_9")};
    border: 1px solid ${i("neutral","_3")};
    &:hover {
      background: ${i("neutral","_6")};
      border: 1px solid ${i("neutral","_3")};
    }
    &:disabled {
      background: ${i("neutral","_7")};
      border: 1px solid ${i("neutral","_4")};
      color: ${i("neutral","_5")};
    }
  `,dark:l`
    background: ${i("neutral","_5")};
    &:hover {
      background: ${i("neutral","_6")};
    }
    &:disabled {
      background: ${i("neutral","_6")};
      color: ${i("neutral","_5")};
    }
  `,danger:l`
    background: ${i("red","_5")};
    &:hover {
      background: #bb150b;
    }
    /* &:disabled {
      background: ${i("neutral","_6")};
      color: ${i("neutral","_5")};
    } */
  `},$=({disabled:e=!1,hierarchy:r="primary",height:o="48px",...n})=>t.jsx(te,{disabled:e,hierarchy:r,height:o,...n,children:n.children}),te=a.button.withConfig({shouldForwardProp:e=>!["width","height","hierarchy","margin","radius","fullWidth","bgColor"].includes(e)})`
  ${c.flex({direction:"row"})};
  width: ${({width:e,fullWidth:r})=>e?typeof e=="number"?`${e}px`:e:r?"100%":"auto"};
  height: ${({height:e})=>e?typeof e=="number"?e+"px":e:"auto"};
  margin: ${e=>e.margin};
  ${({hierarchy:e,bgColor:r})=>{if(e==="primary")return x.primary;if(e==="normal")return x.normal;if(e==="ghost")return x.ghost;if(e==="dark")return x.dark;if(e==="danger")return x.danger;if(e==="custom")return l`
        background-color: ${r};
      `}};
  border-radius: ${({radius:e})=>e||"30px"};
  transition: all 0.4s ease;
  color: ${i("neutral","_1")};
  background-color: ${({bgColor:e})=>e};
`;$.__docgenInfo={description:"",methods:[],displayName:"Button",props:{disabled:{defaultValue:{value:"false",computed:!1},required:!1},hierarchy:{defaultValue:{value:"'primary'",computed:!1},required:!1},height:{defaultValue:{value:"'48px'",computed:!1},required:!1}}};const ut=a.section`
  ${c.flex({align:"normal",justify:"normal"})};
  position: relative;
  width: 100%;
  height: calc(100vh - 48px);
`,re=a($)`
  ${c.flex({direction:"row"})};
  height: 25px;
  border-radius: 12.5px;
  padding: 0px 12px;
  transition: background-color 0.4s ease;
  &:hover {
    background-color: ${i("neutral","b")};
  }
`,ne=({copyStr:e,tabIndex:r})=>{const[o,n]=u.useState(!1),s=j(),p=u.useCallback(()=>{o||(n(d=>!d),navigator.clipboard.writeText(e))},[o,e]);return u.useEffect(()=>{const d=setTimeout(()=>n(!1),2e3);return()=>{clearTimeout(d)}},[o]),t.jsx(re,{isClicked:o,onClick:p,tabIndex:r&&r,bgColor:s.neutral._7,children:t.jsx(m,{type:"body2Reg",children:o?"Copied!":"Copy"})})};ne.__docgenInfo={description:"",methods:[],displayName:"Copy",props:{copyStr:{required:!0,tsType:{name:"string"},description:""},tabIndex:{required:!1,tsType:{name:"number"},description:""}}};const oe=a.div`
  ${c.flex({direction:"row"})};
  ${v.body2Reg};
  position: absolute;
  width: max-content;
  height: 25px;
  visibility: hidden;
  z-index: 1;
  padding: 0px 17px;
  background-color: ${i("neutral","_9")};
  border-radius: 13px;
  transform: scale(0.6);
  cursor: default;

  &.top {
    top: -27px;
  }

  &.bottom {
    bottom: -27px;
  }
`,ie=a.div`
  ${c.flex({direction:"row"})};
  position: relative;
  cursor: pointer;
  &:hover .tooltip,
  &.isClicked .tooltip {
    transition: all 0.1s ease-in-out;
    visibility: visible;
    transform: scale(1);
  }
`,ae=({children:e,copyText:r,className:o,position:n="bottom"})=>{const[s,p]=u.useState(!1),d=u.useCallback(()=>{p(!0),navigator.clipboard.writeText(r)},[s,r]);return u.useEffect(()=>{const h=setTimeout(()=>p(!1),2e3);return()=>{clearTimeout(h)}},[s]),t.jsxs(ie,{className:s?`${o} isClicked`:o,children:[t.jsx("div",{onClick:d,children:e}),t.jsx(oe,{className:`tooltip ${n}`,children:t.jsx(m,{type:"body3Reg",children:s?"Copied!":"Copy to clipboard"})})]})};ae.__docgenInfo={description:"",methods:[],displayName:"CopyTooltip",props:{children:{required:!0,tsType:{name:"ReactReactNode",raw:"React.ReactNode"},description:""},copyText:{required:!0,tsType:{name:"string"},description:""},position:{required:!1,tsType:{name:"union",raw:"'top' | 'bottom'",elements:[{name:"literal",value:"'top'"},{name:"literal",value:"'bottom'"}]},description:"",defaultValue:{value:"'bottom'",computed:!1}},className:{required:!1,tsType:{name:"string"},description:""}}};const se=l`
  ${v.body2Reg};
  width: 100%;
  height: 48px;
  background-color: ${i("neutral","_9")};
  color: ${i("neutral","_1")};
  border-radius: 30px;
  padding: 14px 16px;
  &[type='password'] {
    letter-spacing: 7px;
  }
  &::placeholder {
    color: ${i("neutral","a")};
    letter-spacing: 0px;
  }
`,ht=a.input.withConfig({shouldForwardProp:e=>!["error","margin"].includes(e)})`
  ${se};
  border: 1px solid ${({error:e,theme:r})=>e?r.red._5:r.neutral._7};
  margin: ${({margin:e})=>e&&e};
`,m=({type:e,children:r,display:o="block",textAlign:n="left",color:s,margin:p,className:d="",...h})=>t.jsx(le,{type:e,display:o,textAlign:n,color:s,margin:p,className:d,...h,children:r}),le=a.div.withConfig({shouldForwardProp:e=>!["type","display","textAlign","color","margin"].includes(e)})`
  ${e=>l`
      ${v[e.type]};
      text-align: ${e.textAlign};
      display: ${e.display};
      color: ${e.color};
      white-space: pre-wrap;
      margin: ${e.margin};
    `}
`;m.__docgenInfo={description:"",methods:[],displayName:"Text",props:{className:{required:!1,tsType:{name:"string"},description:"",defaultValue:{value:"''",computed:!1}},type:{required:!0,tsType:{name:"FontsType"},description:""},display:{required:!1,tsType:{name:"CSSProperties['display']",raw:"CSSProperties['display']"},description:"",defaultValue:{value:"'block'",computed:!1}},textAlign:{required:!1,tsType:{name:"CSSProperties['textAlign']",raw:"CSSProperties['textAlign']"},description:"",defaultValue:{value:"'left'",computed:!1}},color:{required:!1,tsType:{name:"string"},description:""},margin:{required:!1,tsType:{name:"CSSProperties['margin']",raw:"CSSProperties['margin']"},description:""}}};const de=a(m)`
  width: 100%;
  padding-left: 16px;
`,ce=({text:e})=>{const r=j();return t.jsx(de,{type:"captionReg",color:r.red._5,children:e})};ce.__docgenInfo={description:"",methods:[],displayName:"ErrorText",props:{text:{required:!0,tsType:{name:"string"},description:""}}};const pe=({title:e,textType:r="body1Bold",mode:o="DEFAULT",className:n,disabled:s,onClick:p,gap:d=12,icon:h="ARROW"})=>s?t.jsx(t.Fragment,{}):t.jsxs(me,{className:n,onClick:p,mode:o,gap:d,children:[t.jsx(m,{type:r,color:"inherit",children:e}),h==="ARROW"&&t.jsx(y,{name:"iconArrowV2",className:"icon-arrow-v2"}),h==="WEBLINK"&&t.jsx(y,{name:"iconWebLink",className:"icon-weblink"})]}),ue=l`
  .icon-arrow-v2 * {
    transition: 0.2s;
    stroke: ${({theme:e,mode:r})=>r==="DANGER"?e.red.b:e.neutral.a};
  }
  .icon-weblink * {
    transition: 0.2s;
    fill: ${({theme:e,mode:r})=>r==="DANGER"?e.red.b:e.neutral.a};
  }
`,he=l`
  .icon-arrow-v2 * {
    stroke: ${({theme:e,mode:r})=>r==="DANGER"?e.red._5:e.neutral._1};
  }
  .icon-weblink * {
    fill: ${({theme:e,mode:r})=>r==="DANGER"?e.red._5:e.neutral._1};
  }
`,me=a.button`
  & + & {
    margin-top: ${({gap:e})=>typeof e=="number"?e+"px":e};
  }
  ${ue};
  ${c.flex({direction:"row",justify:"space-between"})};
  flex-shrink: 0;
  width: 100%;
  height: 54px;
  padding: 0px 24px 0px 20px;
  border-radius: 18px;
  transition: all 0.3s ease;
  background-color: ${i("neutral","_7")};
  color: ${({theme:e,mode:r})=>r==="DANGER"?e.red._5:e.neutral._1};
  &:hover {
    background-color: ${i("neutral","b")};
    ${he};
  }
`;pe.__docgenInfo={description:"",methods:[],displayName:"FullButtonRightIcon",props:{mode:{required:!1,tsType:{name:"union",raw:"'DEFAULT' | 'DANGER' | 'HOVER'",elements:[{name:"literal",value:"'DEFAULT'"},{name:"literal",value:"'DANGER'"},{name:"literal",value:"'HOVER'"}]},description:"",defaultValue:{value:"'DEFAULT'",computed:!1}},gap:{required:!1,tsType:{name:"union",raw:"string | number",elements:[{name:"string"},{name:"number"}]},description:"",defaultValue:{value:"12",computed:!1}},icon:{required:!1,tsType:{name:"union",raw:"'ARROW' | 'WEBLINK'",elements:[{name:"literal",value:"'ARROW'"},{name:"literal",value:"'WEBLINK'"}]},description:"",defaultValue:{value:"'ARROW'",computed:!1}},title:{required:!0,tsType:{name:"string"},description:""},textType:{required:!1,tsType:{name:"FontsType"},description:"",defaultValue:{value:"'body1Bold'",computed:!1}},className:{required:!1,tsType:{name:"string"},description:""},disabled:{required:!1,tsType:{name:"boolean"},description:""},onClick:{required:!1,tsType:{name:"signature",type:"function",raw:"(e: React.MouseEvent<HTMLButtonElement>) => unknown",signature:{arguments:[{type:{name:"ReactMouseEvent",raw:"React.MouseEvent<HTMLButtonElement>",elements:[{name:"HTMLButtonElement"}]},name:"e"}],return:{name:"unknown"}}},description:""}}};const ge="data:image/svg+xml,%3csvg%20width='24'%20height='24'%20viewBox='0%200%2024%2024'%20fill='none'%20xmlns='http://www.w3.org/2000/svg'%3e%3cline%20x1='4.75'%20y1='6.25'%20x2='19.25'%20y2='6.25'%20stroke='white'%20strokeWidth='1.5'%20strokeLinecap='round'/%3e%3cline%20x1='4.75'%20y1='12.25'%20x2='19.25'%20y2='12.25'%20stroke='white'%20strokeWidth='1.5'%20strokeLinecap='round'/%3e%3cline%20x1='4.75'%20y1='18.25'%20x2='19.25'%20y2='18.25'%20stroke='white'%20strokeWidth='1.5'%20strokeLinecap='round'/%3e%3c/svg%3e";let _;window.location.hash.indexOf("approve")===-1?_=1:_=0;const mt=a.button`
  opacity: ${_};
  width: 24px;
  height: 24px;
  background: url(${ge}) no-repeat center center;
`,L=({className:e})=>t.jsxs("svg",{className:e,width:"22",height:"22",viewBox:"0 0 22 22",fill:"none",xmlns:"http://www.w3.org/2000/svg",children:[t.jsxs("g",{clipPath:"url(#clip0_4193_68907)",children:[t.jsx("path",{d:"M12.2604 12.6158C14.116 12.6158 15.6204 11.1693 15.6204 9.38507C15.6204 7.60076 14.116 6.1543 12.2604 6.1543C10.4047 6.1543 8.90039 7.60076 8.90039 9.38507C8.90039 11.1693 10.4047 12.6158 12.2604 12.6158Z",stroke:"white",strokeLinecap:"round",strokeLinejoin:"round"}),t.jsx("path",{d:"M1.33984 8.98047H3.85984",stroke:"white",strokeLinecap:"round",strokeLinejoin:"round"}),t.jsx("path",{d:"M1.33984 4.94238H3.85984",stroke:"white",strokeLinecap:"round",strokeLinejoin:"round"}),t.jsx("path",{d:"M1.33984 13.0195H3.85984",stroke:"white",strokeLinecap:"round",strokeLinejoin:"round"}),t.jsx("path",{d:"M1.33984 17.0576H3.85984",stroke:"white",strokeLinecap:"round",strokeLinejoin:"round"}),t.jsx("path",{d:"M7.21973 15.0381C7.80664 14.2859 8.56762 13.6752 9.44243 13.2548C10.3172 12.8342 11.2819 12.6152 12.2599 12.6152C13.2379 12.6152 14.2025 12.8341 15.0774 13.2546C15.9522 13.6751 16.7132 14.2856 17.3001 15.0379",stroke:"white",strokeLinecap:"round",strokeLinejoin:"round"}),t.jsx("path",{d:"M20.6604 19.8845L20.6604 2.11531C20.6604 1.66924 20.2843 1.30762 19.8204 1.30762L4.70035 1.30762C4.23644 1.30762 3.86035 1.66924 3.86035 2.11531L3.86035 19.8845C3.86035 20.3306 4.23644 20.6922 4.70035 20.6922L19.8204 20.6922C20.2843 20.6922 20.6604 20.3306 20.6604 19.8845Z",stroke:"white",strokeLinecap:"round",strokeLinejoin:"round"})]}),t.jsx("defs",{children:t.jsx("clipPath",{id:"clip0_4193_68907",children:t.jsx("rect",{width:"21",height:"21",fill:"white",transform:"translate(0.5 0.5)"})})})]}),N=({className:e})=>t.jsxs("svg",{className:e,width:"14",height:"14",viewBox:"0 0 14 14",fill:"none",xmlns:"http://www.w3.org/2000/svg",children:[t.jsxs("g",{clipPath:"url(#clip0_4193_45146)",children:[t.jsx("path",{d:"M7.83961 8.07722C9.07671 8.07722 10.0796 7.11289 10.0796 5.92338C10.0796 4.73384 9.07671 3.76953 7.83961 3.76953C6.60251 3.76953 5.59961 4.73384 5.59961 5.92338C5.59961 7.11289 6.60251 8.07722 7.83961 8.07722Z",stroke:"white",strokeLinecap:"round",strokeLinejoin:"round"}),t.jsx("path",{d:"M0.55957 5.6543H2.23957",stroke:"white",strokeLinecap:"round",strokeLinejoin:"round"}),t.jsx("path",{d:"M0.55957 2.96191H2.23957",stroke:"white",strokeLinecap:"round",strokeLinejoin:"round"}),t.jsx("path",{d:"M0.55957 8.3457H2.23957",stroke:"white",strokeLinecap:"round",strokeLinejoin:"round"}),t.jsx("path",{d:"M0.55957 11.0381H2.23957",stroke:"white",strokeLinecap:"round",strokeLinejoin:"round"}),t.jsx("path",{d:"M4.47949 9.69237C4.87077 9.1909 5.37809 8.78383 5.96129 8.5035C6.54448 8.22313 7.18758 8.07715 7.83959 8.07715C8.4916 8.07715 9.1347 8.22307 9.71794 8.50339C10.3011 8.78372 10.8085 9.19074 11.1998 9.69226",stroke:"white",strokeLinecap:"round",strokeLinejoin:"round"}),t.jsx("path",{d:"M13.4402 12.9227V1.07655C13.4402 0.779166 13.1895 0.538086 12.8802 0.538086H2.80023C2.49096 0.538086 2.24023 0.779166 2.24023 1.07655V12.9227C2.24023 13.2201 2.49096 13.4612 2.80023 13.4612H12.8802C13.1895 13.4612 13.4402 13.2201 13.4402 12.9227Z",stroke:"white",strokeLinecap:"round",strokeLinejoin:"round"})]}),t.jsx("defs",{children:t.jsx("clipPath",{id:"clip0_4193_45146",children:t.jsx("rect",{width:"14",height:"14",fill:"white"})})})]});L.__docgenInfo={description:"",methods:[],displayName:"IconAddressBookLarge",props:{className:{required:!0,tsType:{name:"string"},description:""}}};N.__docgenInfo={description:"",methods:[],displayName:"IconAddressBookSmall",props:{className:{required:!0,tsType:{name:"string"},description:""}}};const I=({className:e})=>t.jsx("svg",{width:"6",height:"10",viewBox:"0 0 6 10",fill:"none",xmlns:"http://www.w3.org/2000/svg",className:e,children:t.jsx("path",{d:"M1 9L5 5L1 1",stroke:"#777777",strokeWidth:"1.5",strokeLinecap:"round",strokeLinejoin:"round"})});I.__docgenInfo={description:"",methods:[],displayName:"IconArrowV2",props:{className:{required:!1,tsType:{name:"string"},description:""}}};const xe=f`
  from {
    -webkit-transform: rotate(0deg);
    -o-transform: rotate(0deg);
    transform: rotate(0deg);
  }
  to {
    -webkit-transform: rotate(360deg);
    -o-transform: rotate(360deg);
    transform: rotate(360deg);
  }
`,fe=a.div`
  display: flex;
  width: 20px;
  height: 20px;
  overflow: visible;
  justify-content: center;
  align-items: center;
  padding-left: 16px;
  padding-top: 16px;
  animation: ${xe} 1.5s infinite;

  svg {
    display: flex;
    flex-shrink: 0;
    width: 60px;
    height: 60px;
  }
`,we=()=>t.jsx(fe,{children:t.jsxs("svg",{width:"60",height:"60",viewBox:"0 0 60 60",fill:"none",xmlns:"http://www.w3.org/2000/svg",children:[t.jsxs("g",{filter:"url(#filter0_d_9215_2346)",children:[t.jsx("mask",{id:"path-1-inside-1_9215_2346",fill:"white",children:t.jsx("path",{d:"M12 22C12 23.9778 12.5865 25.9112 13.6853 27.5557C14.7841 29.2002 16.3459 30.4819 18.1732 31.2388C20.0004 31.9957 22.0111 32.1937 23.9509 31.8079C25.8907 31.422 27.6725 30.4696 29.0711 29.0711C30.4696 27.6725 31.422 25.8907 31.8079 23.9509C32.1937 22.0111 31.9957 20.0004 31.2388 18.1732C30.4819 16.3459 29.2002 14.7841 27.5557 13.6853C25.9112 12.5865 23.9778 12 22 12V14.6885C23.4461 14.6885 24.8597 15.1174 26.062 15.9207C27.2644 16.7241 28.2015 17.866 28.7549 19.202C29.3083 20.538 29.4531 22.0081 29.171 23.4264C28.8889 24.8447 28.1925 26.1475 27.17 27.17C26.1475 28.1925 24.8447 28.8889 23.4264 29.171C22.0081 29.4531 20.538 29.3083 19.202 28.7549C17.866 28.2015 16.7241 27.2644 15.9207 26.062C15.1173 24.8597 14.6885 23.4461 14.6885 22H12Z"})}),t.jsx("path",{d:"M12 22C12 23.9778 12.5865 25.9112 13.6853 27.5557C14.7841 29.2002 16.3459 30.4819 18.1732 31.2388C20.0004 31.9957 22.0111 32.1937 23.9509 31.8079C25.8907 31.422 27.6725 30.4696 29.0711 29.0711C30.4696 27.6725 31.422 25.8907 31.8079 23.9509C32.1937 22.0111 31.9957 20.0004 31.2388 18.1732C30.4819 16.3459 29.2002 14.7841 27.5557 13.6853C25.9112 12.5865 23.9778 12 22 12V14.6885C23.4461 14.6885 24.8597 15.1174 26.062 15.9207C27.2644 16.7241 28.2015 17.866 28.7549 19.202C29.3083 20.538 29.4531 22.0081 29.171 23.4264C28.8889 24.8447 28.1925 26.1475 27.17 27.17C26.1475 28.1925 24.8447 28.8889 23.4264 29.171C22.0081 29.4531 20.538 29.3083 19.202 28.7549C17.866 28.2015 16.7241 27.2644 15.9207 26.062C15.1173 24.8597 14.6885 23.4461 14.6885 22H12Z",stroke:"url(#paint0_angular_9215_2346)",strokeWidth:"24",shapeRendering:"crispEdges",mask:"url(#path-1-inside-1_9215_2346)"})]}),t.jsxs("defs",{children:[t.jsxs("filter",{id:"filter0_d_9215_2346",x:"0",y:"0",width:"60",height:"60",filterUnits:"userSpaceOnUse",colorInterpolationFilters:"sRGB",children:[t.jsx("feFlood",{floodOpacity:"0",result:"BackgroundImageFix"}),t.jsx("feColorMatrix",{in:"SourceAlpha",type:"matrix",values:"0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0",result:"hardAlpha"}),t.jsx("feOffset",{dx:"8",dy:"8"}),t.jsx("feGaussianBlur",{stdDeviation:"10"}),t.jsx("feComposite",{in2:"hardAlpha",operator:"out"}),t.jsx("feColorMatrix",{type:"matrix",values:"0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.2 0"}),t.jsx("feBlend",{mode:"normal",in2:"BackgroundImageFix",result:"effect1_dropShadow_9215_2346"}),t.jsx("feBlend",{mode:"normal",in:"SourceGraphic",in2:"effect1_dropShadow_9215_2346",result:"shape"})]}),t.jsxs("radialGradient",{id:"paint0_angular_9215_2346",cx:"0",cy:"0",r:"1",gradientUnits:"userSpaceOnUse",gradientTransform:"translate(22 22.125) rotate(-90) scale(10.125)",children:[t.jsx("stop",{stopColor:"white"}),t.jsx("stop",{offset:"1",stopColor:"white",stopOpacity:"0.2"})]})]})]})});we.__docgenInfo={description:"",methods:[],displayName:"IconButtonLoading"};const S=({className:e})=>t.jsxs("svg",{className:e,width:"12",height:"12",viewBox:"0 0 12 12",fill:"none",xmlns:"http://www.w3.org/2000/svg",children:[t.jsx("line",{x1:"0.75",y1:"-0.75",x2:"12.4353",y2:"-0.75",transform:"matrix(0.703174 0.711018 -0.703174 0.711018 1 1.6875)",stroke:"white",strokeWidth:"1.5",strokeLinecap:"round"}),t.jsx("line",{x1:"0.75",y1:"-0.75",x2:"12.4353",y2:"-0.75",transform:"matrix(-0.703174 0.711018 0.703174 0.711018 11 1.6875)",stroke:"white",strokeWidth:"1.5",strokeLinecap:"round"})]});S.__docgenInfo={description:"",methods:[],displayName:"IconCancel",props:{className:{required:!0,tsType:{name:"string"},description:""}}};const R=({className:e})=>t.jsxs("svg",{className:e,width:"28",height:"28",viewBox:"0 0 28 28",fill:"none",xmlns:"http://www.w3.org/2000/svg",children:[t.jsx("circle",{className:"icon-primary",cx:"14",cy:"14",r:"12",fill:"#646486"}),t.jsx("path",{className:"icon-default",fillRule:"evenodd",clipRule:"evenodd",d:"M14 5.25C14.6904 5.25 15.25 5.80964 15.25 6.5V14.0833L18 17.75C18.4142 18.3023 18.3023 19.0858 17.75 19.5C17.1977 19.9142 16.4142 19.8023 16 19.25L12.75 14.9167V6.5C12.75 5.80964 13.3096 5.25 14 5.25Z",fill:"#212128"})]});R.__docgenInfo={description:"",methods:[],displayName:"IconClock",props:{className:{required:!0,tsType:{name:"string"},description:""}}};const q=({className:e})=>t.jsx("svg",{width:"100",height:"100",viewBox:"0 0 100 100",fill:"none",xmlns:"http://www.w3.org/2000/svg",className:e,children:t.jsx("path",{fillRule:"evenodd",clipRule:"evenodd",d:"M50 100C77.6142 100 100 77.6142 100 50C100 22.3858 77.6142 0 50 0C22.3858 0 0 22.3858 0 50C0 77.6142 22.3858 100 50 100ZM22.364 71.4974L43.5 50.3614L22 28.8614L28.364 22.4975L49.8639 43.9974L71.8614 21.9999L78.2254 28.3639L56.2279 50.3614L77.8614 71.9949L71.4975 78.3589L49.8639 56.7254L28.7279 77.8614L22.364 71.4974Z",fill:"#EF2D21"})});q.__docgenInfo={description:"",methods:[],displayName:"IconConnectFailed",props:{className:{required:!0,tsType:{name:"string"},description:""}}};const Ce=f`
  from {
    -webkit-transform: rotate(0deg);
    -o-transform: rotate(0deg);
    transform: rotate(0deg);
  }
  to {
    -webkit-transform: rotate(360deg);
    -o-transform: rotate(360deg);
    transform: rotate(360deg);
  }
`,ye=a.svg`
  width: 100px;
  height: 100px;
  margin: 20px auto;
  animation: ${Ce} 1.5s infinite;
`,B=({className:e})=>t.jsxs(ye,{width:"100",height:"100",viewBox:"0 0 100 100",fill:"none",xmlns:"http://www.w3.org/2000/svg",className:e,children:[t.jsx("rect",{width:"100",height:"100",rx:"50",fill:"#191920"}),t.jsx("path",{fillRule:"evenodd",clipRule:"evenodd",d:"M30.9995 69.0016C41.4932 79.4953 58.5068 79.4953 69.0005 69.0016C79.4942 58.5079 79.4942 41.4942 69.0005 31.0005C58.5068 20.5068 41.4932 20.5068 30.9995 31.0005C20.5058 41.4942 20.5058 58.5079 30.9995 69.0016ZM40.2283 59.7722C45.6251 65.1689 54.3749 65.1689 59.7717 59.7722C65.1685 54.3754 65.1685 45.6255 59.7717 40.2288C54.3749 34.832 45.6251 34.832 40.2283 40.2288C34.8315 45.6255 34.8315 54.3754 40.2283 59.7722Z",fill:"url(#paint0_linear_4554_105222)"}),t.jsx("circle",{cx:"43",cy:"31.0078",r:"7",fill:"#0059FF"}),t.jsx("defs",{children:t.jsxs("linearGradient",{id:"paint0_linear_4554_105222",x1:"34.6853",y1:"66.271",x2:"57.7026",y2:"43.1492",gradientUnits:"userSpaceOnUse",children:[t.jsx("stop",{stopColor:"#0059FF"}),t.jsx("stop",{offset:"1",stopColor:"#0058C9",stopOpacity:"0"})]})})]});B.__docgenInfo={description:"",methods:[],displayName:"IconConnectLoading",props:{className:{required:!0,tsType:{name:"string"},description:""}}};const M=({className:e})=>t.jsxs("svg",{className:e,width:"28",height:"28",viewBox:"0 0 28 28",fill:"none",xmlns:"http://www.w3.org/2000/svg",children:[t.jsx("rect",{className:"icon-primary",x:"2",y:"2",width:"11",height:"11",rx:"2",fill:"#646486"}),t.jsx("rect",{className:"icon-primary",x:"2",y:"15",width:"11",height:"11",rx:"2",fill:"#646486"}),t.jsx("rect",{className:"icon-default",x:"15",y:"2",width:"11",height:"11",rx:"2",fill:"#646486"}),t.jsx("rect",{className:"icon-primary",x:"15",y:"15",width:"11",height:"11",rx:"2",fill:"#646486"})]});M.__docgenInfo={description:"",methods:[],displayName:"IconGallery",props:{className:{required:!0,tsType:{name:"string"},description:""}}};const E=({className:e})=>t.jsxs("svg",{className:e,width:"24",height:"20",viewBox:"0 0 24 20",fill:"none",xmlns:"http://www.w3.org/2000/svg",children:[t.jsxs("g",{clipPath:"url(#clip0_5399_110549)",children:[t.jsx("path",{d:"M23.8481 10.0715C23.1658 9.16916 21.4478 7.23906 18.7948 5.78516L16.3187 8.24158C16.6977 8.91839 16.8998 9.72044 16.8998 10.5476C16.8998 13.2298 14.7269 15.3854 12.0234 15.3854C11.1896 15.3854 10.3812 15.1848 9.69887 14.8089L8.03125 16.4633C9.24397 16.8142 10.5579 17.0398 12.0234 17.0398C18.6431 17.0398 22.6858 12.5279 23.8733 11.024C24.0501 10.7482 24.0502 10.3473 23.8481 10.0715Z",fill:"white"}),t.jsx("path",{d:"M11.9937 14.0548C13.9393 14.0548 15.5309 12.4756 15.5309 10.5457C15.5309 10.0946 15.4299 9.64328 15.2782 9.24219L10.6797 13.8042C11.0842 13.9546 11.539 14.0548 11.9937 14.0548Z",fill:"white"}),t.jsx("path",{d:"M21.3186 0.244433C20.9901 -0.0814777 20.4596 -0.0814777 20.1311 0.244433L15.7852 4.55577C14.6483 4.22986 13.385 4.0293 12.0205 4.0293C5.40067 4.0293 1.35804 8.54119 0.170518 10.0451C-0.0568393 10.3209 -0.0568393 10.722 0.170518 10.9977C0.852758 11.875 2.49503 13.755 5.04696 15.1837L1.63588 18.5677C1.30737 18.8936 1.30737 19.4199 1.63588 19.7458C1.81284 19.9213 2.01481 19.9965 2.24232 19.9965C2.46968 19.9965 2.67183 19.9213 2.84876 19.7458L21.3438 1.39751C21.6471 1.12178 21.6471 0.5702 21.3186 0.244433ZM7.11883 10.5465C7.11883 7.86438 9.31699 5.70881 11.9952 5.70881C12.7533 5.70881 13.4859 5.88433 14.143 6.2101L13.107 7.23781C12.7533 7.13762 12.3996 7.06229 11.9952 7.06229C10.0497 7.06229 8.45803 8.64148 8.45803 10.5714C8.45803 10.9473 8.53382 11.3234 8.63501 11.6744L7.59902 12.7021C7.29571 12.0253 7.11883 11.2984 7.11883 10.5465Z",fill:"white"})]}),t.jsx("defs",{children:t.jsx("clipPath",{id:"clip0_5399_110549",children:t.jsx("rect",{width:"24",height:"20",fill:"white"})})})]});E.__docgenInfo={description:"",methods:[],displayName:"IconHiddenEye",props:{className:{required:!0,tsType:{name:"string"},description:""}}};const A=({className:e})=>t.jsxs("svg",{className:e,width:"23",height:"25",viewBox:"0 0 23 25",fill:"none",xmlns:"http://www.w3.org/2000/svg",children:[t.jsx("path",{className:"icon-primary",d:"M14.7002 16.1548C14.0154 16.716 13.9153 17.7261 14.4765 18.4108L18.6187 23.4646C19.18 24.1493 20.19 24.2495 20.8748 23.6882C21.5595 23.127 21.6597 22.1169 21.0984 21.4322L16.9562 16.3784C16.395 15.6937 15.3849 15.5936 14.7002 16.1548Z",fill:"#646486"}),t.jsx("path",{className:"icon-default",d:"M10 20C15.5228 20 20 15.5228 20 10C20 4.47715 15.5228 0 10 0C4.47715 0 0 4.47715 0 10C0 15.5228 4.47715 20 10 20Z",fill:"#646486"}),t.jsx("path",{d:"M10 17C13.866 17 17 13.866 17 10C17 6.13401 13.866 3 10 3C6.13401 3 3 6.13401 3 10C3 13.866 6.13401 17 10 17Z",fill:"#212128"})]});A.__docgenInfo={description:"",methods:[],displayName:"IconSearch",props:{className:{required:!0,tsType:{name:"string"},description:""}}};const H=({className:e})=>t.jsxs("svg",{className:e,width:"28",height:"28",viewBox:"0 0 28 28",fill:"none",xmlns:"http://www.w3.org/2000/svg",children:[t.jsx("circle",{className:"icon-default",cx:"14",cy:"14",r:"4",fill:"#212128"}),t.jsx("path",{className:"icon-primary",fillRule:"evenodd",clipRule:"evenodd",d:"M23.804 15.842C24.2213 16.0637 24.5433 16.4137 24.7698 16.7637C25.2109 17.487 25.1752 18.3737 24.7459 19.1554L23.9113 20.5554C23.4702 21.302 22.6475 21.7687 21.801 21.7687C21.3837 21.7687 20.9187 21.652 20.5372 21.4187C20.2272 21.2204 19.8695 21.1504 19.488 21.1504C18.3076 21.1504 17.318 22.1187 17.2822 23.2737C17.2822 24.6154 16.1853 25.6654 14.8142 25.6654H13.1927C11.8097 25.6654 10.7128 24.6154 10.7128 23.2737C10.6889 22.1187 9.69932 21.1504 8.51896 21.1504C8.12551 21.1504 7.76782 21.2204 7.46975 21.4187C7.08822 21.652 6.61131 21.7687 6.20593 21.7687C5.34749 21.7687 4.52481 21.302 4.08367 20.5554L3.26099 19.1554C2.81985 18.397 2.796 17.487 3.23715 16.7637C3.42791 16.4137 3.7856 16.0637 4.19097 15.842C4.52481 15.6787 4.73942 15.4104 4.94211 15.0954C5.53825 14.092 5.18057 12.7737 4.16713 12.1787C2.98677 11.5137 2.60524 10.032 3.28484 8.87703L4.08367 7.50037C4.77519 6.34536 6.25362 5.93703 7.44591 6.6137C8.48319 7.1737 9.83047 6.80036 10.4385 5.8087C10.6293 5.48203 10.7366 5.13203 10.7128 4.78203C10.6889 4.32703 10.8201 3.89536 11.0466 3.54536C11.4877 2.82203 12.2866 2.35536 13.1569 2.33203H14.8381C15.7204 2.33203 16.5192 2.82203 16.9603 3.54536C17.1749 3.89536 17.318 4.32703 17.2822 4.78203C17.2584 5.13203 17.3657 5.48203 17.5565 5.8087C18.1645 6.80036 19.5118 7.1737 20.561 6.6137C21.7414 5.93703 23.2317 6.34536 23.9113 7.50037L24.7102 8.87703C25.4017 10.032 25.0202 11.5137 23.8279 12.1787C22.8144 12.7737 22.4568 14.092 23.0648 15.0954C23.2556 15.4104 23.4702 15.6787 23.804 15.842ZM10.6293 14.0104C10.6293 15.842 12.1435 17.3004 14.0154 17.3004C15.8873 17.3004 17.3657 15.842 17.3657 14.0104C17.3657 12.1787 15.8873 10.7087 14.0154 10.7087C12.1435 10.7087 10.6293 12.1787 10.6293 14.0104Z",fill:"#646486"})]});H.__docgenInfo={description:"",methods:[],displayName:"IconSetting",props:{className:{required:!0,tsType:{name:"string"},description:""}}};const ve=f`
  from {
    -webkit-transform: rotate(0deg);
    -o-transform: rotate(0deg);
    transform: rotate(0deg);
  }
  to {
    -webkit-transform: rotate(360deg);
    -o-transform: rotate(360deg);
    transform: rotate(360deg);
  }
`,be=a.svg`
  width: 00px;
  height: 00px;
  margin: 0 auto;
  animation: ${ve} 1.5s infinite;
`,V=({className:e})=>t.jsxs(be,{width:"100",height:"100",viewBox:"0 0 100 100",fill:"none",xmlns:"http://www.w3.org/2000/svg",className:e,children:[t.jsx("rect",{width:"100",height:"100",rx:"50",fill:"#191920"}),t.jsx("path",{fillRule:"evenodd",clipRule:"evenodd",d:"M30.9995 69.0016C41.4932 79.4953 58.5068 79.4953 69.0005 69.0016C79.4942 58.5079 79.4942 41.4942 69.0005 31.0005C58.5068 20.5068 41.4932 20.5068 30.9995 31.0005C20.5058 41.4942 20.5058 58.5079 30.9995 69.0016ZM40.2283 59.7722C45.6251 65.1689 54.3749 65.1689 59.7717 59.7722C65.1685 54.3754 65.1685 45.6255 59.7717 40.2288C54.3749 34.832 45.6251 34.832 40.2283 40.2288C34.8315 45.6255 34.8315 54.3754 40.2283 59.7722Z",fill:"url(#paint0_linear_4554_105222)"}),t.jsx("circle",{cx:"43",cy:"31.0078",r:"7",fill:"#0059FF"}),t.jsx("defs",{children:t.jsxs("linearGradient",{id:"paint0_linear_4554_105222",x1:"34.6853",y1:"66.271",x2:"57.7026",y2:"43.1492",gradientUnits:"userSpaceOnUse",children:[t.jsx("stop",{stopColor:"#0059FF"}),t.jsx("stop",{offset:"1",stopColor:"#0058C9",stopOpacity:"0"})]})})]});V.__docgenInfo={description:"",methods:[],displayName:"IconSpinnerLoading",props:{className:{required:!0,tsType:{name:"string"},description:""}}};const P=({className:e})=>t.jsx("svg",{className:e,width:"24",height:"24",viewBox:"0 0 24 24",fill:"none",xmlns:"http://www.w3.org/2000/svg",children:t.jsx("path",{d:"M12 0C5.37258 0 0 5.37258 0 12C0 18.6274 5.37258 24 12 24C18.6274 24 24 18.6274 24 12C24 5.37258 18.6274 0 12 0ZM11.04 4.08H13.2V11.04H20.16V13.2H13.2V20.16H11.04V13.2H4.08V11.04H11.04V4.08Z"})});P.__docgenInfo={description:"",methods:[],displayName:"IconTokenAdded",props:{className:{required:!0,tsType:{name:"string"},description:""}}};const W=({className:e})=>t.jsxs("svg",{className:e,width:"28",height:"28",viewBox:"0 0 28 28",fill:"none",xmlns:"http://www.w3.org/2000/svg",children:[t.jsx("path",{className:"icon-default",d:"M2.52432 9.64346C2.23475 8.57752 2.86411 7.47866 3.93005 7.18909L20.4736 2.69482C21.7555 2.34656 23.0145 3.3218 22.9978 4.65011L22.9019 12.2414C22.8911 13.1016 22.3313 13.8586 21.5119 14.1209L7.15422 18.7174C6.06893 19.0649 4.91311 18.4367 4.61437 17.337L2.52432 9.64346Z",fill:"#646486"}),t.jsx("rect",{className:"icon-primary",x:"1.5",y:"7.50003",width:"25",height:"18",rx:"2.5",fill:"#646486",stroke:"#212128"}),t.jsx("circle",{className:"icon-default",cx:"23",cy:"17",r:"1",fill:"#212128"})]});W.__docgenInfo={description:"",methods:[],displayName:"IconWallet",props:{className:{required:!0,tsType:{name:"string"},description:""}}};const F=({className:e})=>t.jsx("svg",{className:e,width:"12",height:"12",viewBox:"0 0 12 12",fill:"none",xmlns:"http://www.w3.org/2000/svg",children:t.jsx("path",{d:"M10 10.6667H2C1.63333 10.6667 1.33333 10.3667 1.33333 10V2C1.33333 1.63333 1.63333 1.33333 2 1.33333H5.33333C5.7 1.33333 6 1.03333 6 0.666667C6 0.3 5.7 0 5.33333 0H1.33333C0.593333 0 0 0.6 0 1.33333V10.6667C0 11.4 0.6 12 1.33333 12H10.6667C11.4 12 12 11.4 12 10.6667V6.66667C12 6.3 11.7 6 11.3333 6C10.9667 6 10.6667 6.3 10.6667 6.66667V10C10.6667 10.3667 10.3667 10.6667 10 10.6667ZM7.33333 0.666667C7.33333 1.03333 7.63333 1.33333 8 1.33333H9.72667L4.65333 6.40667C4.39333 6.66667 4.39333 7.08667 4.65333 7.34667C4.91333 7.60667 5.33333 7.60667 5.59333 7.34667L10.6667 2.27333V4C10.6667 4.36667 10.9667 4.66667 11.3333 4.66667C11.7 4.66667 12 4.36667 12 4V0.666667C12 0.3 11.7 0 11.3333 0H8C7.63333 0 7.33333 0.3 7.33333 0.666667Z",fill:"white"})});F.__docgenInfo={description:"",methods:[],displayName:"IconWebLink",props:{className:{required:!0,tsType:{name:"string"},description:""}}};const ke={iconWallet:W,iconGallery:M,iconSearch:A,iconClock:R,iconSetting:H,iconAddressBookLarge:L,iconAddressBookSmall:N,iconCancel:S,iconArrowV2:I,iconWebLink:F,iconHiddenEye:E,iconConnectLoading:B,iconConnectFailed:q,iconTokenAdded:P,iconSpinnerLoading:V},y=({name:e,className:r="",...o})=>K.createElement(ke[e],{className:r,...o});y.__docgenInfo={description:"",methods:[],displayName:"Icon",props:{name:{required:!0,tsType:{name:"union",raw:"keyof typeof ICONS",elements:[{name:"literal",value:"iconWallet"},{name:"literal",value:"iconGallery"},{name:"literal",value:"iconSearch"},{name:"literal",value:"iconClock"},{name:"literal",value:"iconSetting"},{name:"literal",value:"iconAddressBookLarge"},{name:"literal",value:"iconAddressBookSmall"},{name:"literal",value:"iconCancel"},{name:"literal",value:"iconArrowV2"},{name:"literal",value:"iconWebLink"},{name:"literal",value:"iconHiddenEye"},{name:"literal",value:"iconConnectLoading"},{name:"literal",value:"iconConnectFailed"},{name:"literal",value:"iconTokenAdded"},{name:"literal",value:"iconSpinnerLoading"}]},description:""},className:{required:!1,tsType:{name:"string"},description:"",defaultValue:{value:"''",computed:!1}}}};var _e=(e=>(e.Default="default",e.Normal="normal",e.Static="static",e))(_e||{});const w={default:l`
    background: ${i("neutral","_7")};
    &:hover {
      background: ${i("neutral","b")};
    }
  `,normal:l`
    background: ${i("neutral","_9")};
    &:hover {
      background: ${i("neutral","_7")};
    }
  `,static:l`
    background: ${i("neutral","_7")};
  `},je=({cursor:e,left:r,center:o,right:n,hoverAction:s,onClick:p,className:d,padding:h,mode:g})=>t.jsxs(Te,{cursor:e,hoverAction:s,onClick:p,className:d,padding:h,mode:g,children:[r&&r,o&&o,n&&n]}),Te=a.div`
  ${c.flex({direction:"row"})};
  ${({mode:e})=>e==="default"?w.default:e==="normal"?w.normal:e==="static"?w.static:w.default}
  flex-shrink: 0;
  width: 100%;
  height: 60px;
  padding: ${({padding:e})=>e||"0px 17px 0px 14px"};
  transition: all 0.4s ease;
  border-radius: 18px;
  cursor: ${({cursor:e})=>e??"pointer"};

  .logo {
    margin-right: 12px;
  }

  & + & {
    margin-top: 12px;
  }
`;je.__docgenInfo={description:"",methods:[],displayName:"ListBox",props:{cursor:{required:!1,tsType:{name:"CSSProperties['cursor']",raw:"CSSProperties['cursor']"},description:""},hoverAction:{required:!1,tsType:{name:"boolean"},description:""},className:{required:!1,tsType:{name:"string"},description:""},padding:{required:!1,tsType:{name:"CSSProperties['padding']",raw:"CSSProperties['padding']"},description:""},mode:{required:!1,tsType:{name:"ListHierarchy"},description:""},left:{required:!0,tsType:{name:"ReactReactNode",raw:"React.ReactNode"},description:""},center:{required:!0,tsType:{name:"ReactReactNode",raw:"React.ReactNode"},description:""},right:{required:!0,tsType:{name:"ReactReactNode",raw:"React.ReactNode"},description:""},onClick:{required:!1,tsType:{name:"signature",type:"function",raw:"() => void",signature:{arguments:[],return:{name:"void"}}},description:""}}};const $e=a.div`
  width: ${({width:e})=>e&&e};
  height: ${({height:e})=>e&&e};
  background-color: ${({theme:e,bgColor:r})=>r||e.neutral._5};
  margin: ${({margin:e})=>e&&e};
  border-radius: 50%;
`,Le=({width:e,height:r,bgColor:o,margin:n})=>t.jsx($e,{width:e,height:r,bgColor:o,margin:n});Le.__docgenInfo={description:"",methods:[],displayName:"Circle",props:{width:{required:!1,tsType:{name:"string"},description:""},height:{required:!1,tsType:{name:"string"},description:""},bgColor:{required:!1,tsType:{name:"string"},description:""},margin:{required:!1,tsType:{name:"string"},description:""}}};const Ne=a.div`
  ${({children:e})=>!!e&&c.flex({direction:"row"})};
  width: ${({width:e})=>e||"100%"};
  height: ${({height:e})=>e&&e};
  background-color: ${({theme:e,bgColor:r})=>r||e.neutral._5};
  margin: ${({margin:e})=>e&&e};
  border-radius: ${({radius:e})=>e&&e};
`,Ie=({width:e,height:r,bgColor:o,radius:n,margin:s,children:p})=>t.jsx(Ne,{width:e,height:r,bgColor:o,radius:n,margin:s,children:p});Ie.__docgenInfo={description:"",methods:[],displayName:"Round",props:{width:{required:!1,tsType:{name:"string"},description:""},height:{required:!1,tsType:{name:"string"},description:""},bgColor:{required:!1,tsType:{name:"string"},description:""},radius:{required:!1,tsType:{name:"string"},description:""},margin:{required:!1,tsType:{name:"string"},description:""},children:{required:!1,tsType:{name:"ReactReactNode",raw:"React.ReactNode"},description:""}}};const Se=f`
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
`;a.div`
  ${c.flex({direction:"row"})};
  position: relative;
  width: 70px;
  height: 70px;
  border-radius: 50%;
  background-image: linear-gradient(0deg, #0059ff 8.53%, rgba(0, 88, 201, 0) 69.1%);
  animation: ${Se} 0.9s linear infinite;
  :before {
    content: '';
    background-color: ${i("neutral","_8")};
    width: 36px;
    height: 36px;
    border-radius: 50%;
  }
`;a.span`
  position: absolute;
  top: 5px;
  left: 5px;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background-color: ${i("primary","_6")};
`;const Re=({children:e,selector:r})=>{const[o,n]=u.useState(null);return u.useEffect(()=>{n(document.getElementById(r??"portal-root"))},[r]),t.jsx(t.Fragment,{children:o?O.createPortal(e,o):null})};Re.__docgenInfo={description:"",methods:[],displayName:"Portal",props:{children:{required:!0,tsType:{name:"ReactReactNode",raw:"React.ReactNode"},description:""},selector:{required:!0,tsType:{name:"string"},description:""}}};const qe=a.div`
  position: relative;
  width: 100%;
  height: 140px;
  border: 1px solid ${({error:e,theme:r})=>e?r.red._5:r.neutral._7};
  background-color: ${i("neutral","_9")};
  border-radius: 18px;
  overflow-y: auto;
  padding: 14px 16px 8px;
  margin-top: 20px;
`,Be=a.textarea`
  ${v.body2Reg};
  width: 100%;
  word-wrap: break-word;
  background-color: inherit;
  border: none;
  outline: none;
  color: white;
  resize: none;
  -webkit-text-security: disc;
`,Me=({value:e,onChange:r,onKeyDown:o,error:n=!1})=>t.jsx(qe,{error:n,children:t.jsx(Be,{rows:5,value:e,onChange:r,onKeyDown:o,autoFocus:!0})});Me.__docgenInfo={description:"",methods:[],displayName:"SecureTextarea",props:{value:{required:!0,tsType:{name:"string"},description:""},onChange:{required:!0,tsType:{name:"signature",type:"function",raw:"(e: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) => void",signature:{arguments:[{type:{name:"ReactChangeEvent",raw:"React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>",elements:[{name:"union",raw:"HTMLTextAreaElement | HTMLInputElement",elements:[{name:"HTMLTextAreaElement"},{name:"HTMLInputElement"}]}]},name:"e"}],return:{name:"void"}}},description:""},onKeyDown:{required:!0,tsType:{name:"signature",type:"function",raw:"(e: React.KeyboardEvent<HTMLTextAreaElement | HTMLInputElement>) => void",signature:{arguments:[{type:{name:"ReactKeyboardEvent",raw:"React.KeyboardEvent<HTMLTextAreaElement | HTMLInputElement>",elements:[{name:"union",raw:"HTMLTextAreaElement | HTMLInputElement",elements:[{name:"HTMLTextAreaElement"},{name:"HTMLInputElement"}]}]},name:"e"}],return:{name:"void"}}},description:""},error:{required:!1,tsType:{name:"boolean"},description:"",defaultValue:{value:"false",computed:!1}}}};const Ee=f`
  0% {
    transform: translateX(-100%);
  }
  50% {
    transform: translateX(50%);
  }
  100% {
    transform: translateX(130%);
  }
`,gt=a.div`
  & {
    position: relative;
    background-color: ${i("neutral","_7")};
    border-radius: 18px;
    padding: 0px 17px 0px 14px;
    overflow: hidden;
  }

  &::after {
    position: absolute;
    display: inline-block;
    top: 0;
    right: 0;
    width: 100%;
    height: 100%;
    z-index: 8;
    background: linear-gradient(
      270deg,
      rgba(82, 82, 107, 0) 0%,
      rgba(123, 123, 152, 0.32) 50%,
      rgba(82, 82, 107, 0) 100%
    );
    background-size: 100% 100%;
    animation: ${Ee} 1.5s linear infinite;
    content: '';
  }
`,Ae=a.div`
  ${c.flex({align:"normal",justify:"normal"})};
  width: ${({size:e})=>typeof e=="number"?`${e}px`:e};
  height: ${({size:e})=>typeof e=="number"?`${e}px`:e};

  .icon-spinner {
    width: 100%;
    height: 100%;
  }
`,He=({size:e=100})=>t.jsx(Ae,{size:e,children:t.jsx(y,{name:"iconSpinnerLoading",className:"icon-spinner"})});He.__docgenInfo={description:"",methods:[],displayName:"Spinner",props:{size:{required:!1,tsType:{name:"union",raw:"string | number",elements:[{name:"string"},{name:"number"}]},description:"",defaultValue:{value:"100",computed:!1}}}};const Ve=a.div`
  ${c.flex()};
  width: 171px;
  height: auto;
  visibility: hidden;
  z-index: 1;
  background-color: ${({theme:e,bgColor:r})=>r||e.neutral._9};
  border-radius: 13px;
  position: absolute;
  right: 0px;
  top: ${({posTop:e})=>e||"20px"};
  transform: scale(0.6);

  & > * {
    width: 100%;
    height: 26px;
    padding: 2px 25px;
    border-bottom: 1px solid ${i("neutral","a")};

    &:last-child {
      border-bottom: none;
    }
  }
`,Pe=({bgColor:e,posTop:r,items:o})=>t.jsx(Ve,{className:"static-tooltip",bgColor:e,posTop:r,children:o.map((n,s)=>t.jsx(m,{type:"body3Reg",textAlign:"center",onClick:n.onClick,children:n.tooltipText},s))});Pe.__docgenInfo={description:"",methods:[],displayName:"StaticMultiTooltip",props:{bgColor:{required:!1,tsType:{name:"string"},description:""},posTop:{required:!1,tsType:{name:"string"},description:""},items:{required:!0,tsType:{name:"Array",elements:[{name:"signature",type:"object",raw:`{
  tooltipText: string
  onClick: () => void
}`,signature:{properties:[{key:"tooltipText",value:{name:"string",required:!0}},{key:"onClick",value:{name:"signature",type:"function",raw:"() => void",signature:{arguments:[],return:{name:"void"}},required:!0}}]}}],raw:`{
  tooltipText: string
  onClick: () => void
}[]`},description:""}}};const Z=()=>t.jsxs("svg",{xmlns:"http://www.w3.org/2000/svg",width:"16",height:"15",viewBox:"0 0 16 15",fill:"none",children:[t.jsx("rect",{x:"0.5",width:"15",height:"15",rx:"7.5",fill:"#40C55D",fillOpacity:"0.3"}),t.jsx("path",{d:"M11.2559 4.24405C10.3967 3.38479 9.00636 3.38479 8.1482 4.24405L7.16411 5.22824L7.68205 5.74624L8.66614 4.76205C9.21252 4.21562 10.1347 4.15772 10.7379 4.76205C11.3422 5.36638 11.2843 6.28759 10.7379 6.83403L9.75383 7.81821L10.2728 8.33722L11.2569 7.35303C12.114 6.49377 12.114 5.10332 11.2559 4.24405ZM7.33472 10.2386C6.78835 10.785 5.8662 10.8429 5.26295 10.2386C4.65868 9.63424 4.71657 8.71302 5.26295 8.16659L6.24704 7.1824L5.72808 6.66339L4.74399 7.64758C3.88482 8.50684 3.88482 9.8973 4.74399 10.7555C5.60317 11.6138 6.99349 11.6148 7.85165 10.7555L8.83574 9.77136L8.3178 9.25336L7.33472 10.2386Z",fill:"#40C55D"}),t.jsx("rect",{x:"9.66016",y:"6.43945",width:"3.62116",height:"0.621545",transform:"rotate(135 9.66016 6.43945)",fill:"#40C55D"})]});Z.__docgenInfo={description:"",methods:[],displayName:"IconConnected"};const We=a.div.withConfig({shouldForwardProp:e=>!["status"].includes(e)})`
  display: ${({status:e})=>e?"flex":"none"};
  position: relative;
  width: 15px;
  height: 15px;
  cursor: pointer;
  &:hover > .static-tooltip {
    visibility: visible;
    transition: all 0.1s ease-in-out;
    transform: scale(1);
  }
`,Fe=a.div.withConfig({shouldForwardProp:e=>!["descriptionSize"].includes(e)})`
  position: fixed;
  ${c.flex({direction:"row"})};
  width: max-content;
  height: 25px;
  visibility: hidden;
  z-index: 1;
  padding: 0px 17px;
  background-color: ${i("neutral","_9")};
  border-radius: 13px;
  top: 40px;
  left: ${({descriptionSize:e})=>`calc(50% - ${e/2}px)`};
  transform: scale(0.6);
`,Ze=({status:e,tooltipText:r})=>{const o=u.useRef(null),n=u.useMemo(()=>o.current?.clientWidth||0,[o.current?.clientWidth,r]);return t.jsxs(We,{status:e,children:[t.jsx(Z,{}),t.jsx(Fe,{ref:o,className:"static-tooltip",descriptionSize:n,children:t.jsx(m,{type:"body3Reg",children:r})})]})};Ze.__docgenInfo={description:"",methods:[],displayName:"StatusDot",props:{status:{required:!0,tsType:{name:"boolean"},description:""},tooltipText:{required:!0,tsType:{name:"string"},description:""}}};const C={revealPassword:{title:"Approach with caution!",subTitle:"You’re about to reveal your seed phrase. Please carefully review the checklist below."},revealPrivate:{subTitle:"Your seed phrase is the only way to recover your wallet. Keep it somewhere safe and secret."},approachPassword:{title:"Approach with caution!",subTitle:"You’re about to reveal your private key. Please carefully review the checklist below."},approachPrivate:{subTitle:"Do not share your private key! Anyone with your private key will have full control of your wallet."},approachNetwork:{title:"Approach with caution!",subTitle:`A malicious network provider can lie about the state of the blockchain.
Only add custom networks you trust.`},addingNetwork:{subTitle:`You’re adding an unverified network.
Adena doesn’t verify custom networks.
Only add networks that you trust.`}},De=({type:e,margin:r,padding:o})=>{const n=j();return t.jsxs(Oe,{margin:r,padding:o,children:[C[e].title&&t.jsx(m,{type:"header7",color:n.red.a,children:C[e].title}),C[e].subTitle&&t.jsx(m,{type:"body2Reg",color:"rgba(231, 50, 59, 1)",children:C[e].subTitle})]})},Oe=a.div`
  ${c.flex({align:"flex-start",justify:"space-between"})};
  width: 100%;
  padding: ${e=>e.padding??"14px 16px"};
  gap: 11px;
  border-radius: 18px;
  background-color: rgba(231, 50, 59, 0.1);
  border: 1px solid rgba(231, 50, 59, 0.1);
  margin: ${e=>e.margin};
`;De.__docgenInfo={description:"",methods:[],displayName:"WarningBox",props:{margin:{required:!1,tsType:{name:"CSSProperties['margin']",raw:"CSSProperties['margin']"},description:""},padding:{required:!1,tsType:{name:"CSSProperties['padding']",raw:"CSSProperties['padding']"},description:""},type:{required:!0,tsType:{name:"union",raw:`| 'revealPassword'
| 'revealPrivate'
| 'approachPassword'
| 'approachPrivate'
| 'approachNetwork'
| 'addingNetwork'`,elements:[{name:"literal",value:"'revealPassword'"},{name:"literal",value:"'revealPrivate'"},{name:"literal",value:"'approachPassword'"},{name:"literal",value:"'approachPrivate'"},{name:"literal",value:"'approachNetwork'"},{name:"literal",value:"'addingNetwork'"}]},description:""}}};const Ge=a(Y).withConfig({shouldForwardProp:e=>!["hover","focus","filled","error","disabled"].includes(e)})`
  width: 100%;
  height: 40px;
  position: relative;
  overflow: hidden;
  border-radius: 10px;
  border: 1px solid ${({theme:e})=>e.webNeutral._800};
  ${z.body4}

  ${({theme:e,hover:r,focus:o,filled:n})=>r||o||n?l`
          border-color: ${e.webNeutral._600};
        `:""}
  
  ${({filled:e,disabled:r})=>e&&!r?l`
          box-shadow:
            0px 0px 0px 3px rgba(255, 255, 255, 0.04),
            0px 1px 3px 0px rgba(0, 0, 0, 0.1),
            0px 1px 2px 0px rgba(0, 0, 0, 0.06);
        `:""}

  ${({theme:e,error:r,disabled:o})=>r&&!o?l`
          background: #e0517014;
          border-color: ${e.webError._200};
          box-shadow:
            0px 0px 0px 3px rgba(235, 84, 94, 0.12),
            0px 1px 3px 0px rgba(0, 0, 0, 0.1),
            0px 1px 2px 0px rgba(0, 0, 0, 0.06);
        `:""}
`,Ue=a(X).withConfig({shouldForwardProp:e=>!["hover","focus","filled","error","disabled"].includes(e)})`
  min-width: 106px;
  height: 100%;
  padding: 0 16px;
  background: ${({theme:e})=>e.webInput._100};
  border-right: 1px solid ${({theme:e})=>e.webNeutral._800};
  align-items: center;
  justify-content: center;
  color: ${({theme:e})=>e.webNeutral._500};
  white-space: nowrap;

  ${({theme:e,hover:r,focus:o})=>r||o?l`
          border-color: ${e.webNeutral._600};
        `:""}

  ${({theme:e,error:r,disabled:o})=>r&&!o?l`
          color: ${e.webError._100};
          background: rgba(224, 81, 112, 0.08);
          border-color: ${e.webError._200};
        `:""}
`,Ke=a.input.withConfig({shouldForwardProp:e=>!["hover","focus","filled","error","disabled"].includes(e)})`
  flex: 1;
  width: 100%;
  height: 40px;
  padding: 12px;
  border-radius: 0;
  border: none;
  outline: none;
  box-shadow: none;
  background: ${({error:e,theme:r})=>e?r.webError._300:r.webNeutral._900};
  color: ${({theme:e,disabled:r})=>r?e.webNeutral._600:e.webNeutral._100};

  &::placeholder {
    color: ${({theme:e})=>e.webNeutral._600};
  }

  &:disabled {
    cursor: default;
  }
`,ze=({label:e,value:r,error:o=!1,disabled:n=!1,onChange:s,placeholder:p})=>{const[d,h]=u.useState(!1),[g,T]=u.useState(!1),k=r.length>0;return t.jsxs(Ge,{hover:d&&!n,focus:g&&!n,filled:k,error:o&&!n,disabled:n,onMouseOver:()=>!n&&h(!0),onMouseOut:()=>!n&&h(!1),children:[t.jsx(Ue,{hover:d&&!n,focus:g&&!n,filled:k,error:o&&!n,disabled:n,children:e}),t.jsx(Ke,{hover:d&&!n,focus:g&&!n,filled:k,value:r,placeholder:p,spellCheck:!1,onFocus:()=>!n&&T(!0),onBlur:()=>!n&&T(!1),onChange:D=>!n&&s(D.target.value),error:o&&!n,disabled:n})]})};ze.__docgenInfo={description:"",methods:[],displayName:"WebInputWithLabel",props:{label:{required:!0,tsType:{name:"string"},description:""},value:{required:!0,tsType:{name:"string"},description:""},error:{required:!1,tsType:{name:"boolean"},description:"",defaultValue:{value:"false",computed:!1}},disabled:{required:!1,tsType:{name:"boolean"},description:"",defaultValue:{value:"false",computed:!1}},onChange:{required:!0,tsType:{name:"signature",type:"function",raw:"(value: string) => void",signature:{arguments:[{type:{name:"string"},name:"value"}],return:{name:"void"}}},description:""},placeholder:{required:!1,tsType:{name:"string"},description:""}}};export{$ as B,Le as C,ht as D,ce as E,pe as F,mt as H,y as I,pt as L,Re as P,Ie as R,He as S,m as T,De as W,gt as a,ze as b,we as c,je as d,ut as e,_e as f,Me as g,ne as h,se as i,Pe as j,Ze as k,ae as l};
