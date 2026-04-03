import{n as e,o as t}from"./chunk-zsgVPwQN.js";import{_ as n,b as r,g as i,rt as a,t as o}from"./iframe-BclzClxJ.js";import{t as s}from"./copy-icon-button-DYZNG0bm.js";import{t as c}from"./atoms-kch4SvDy.js";import{n as l,t as u}from"./base-Cfud_vLb.js";import{t as d}from"./web-img-D8LTiWQ_.js";import{t as f}from"./web-text-Bx7m5W80.js";import{o as p,r as m}from"./client-utils-CizyTtJl.js";import{n as h,t as g}from"./chevron-left-HAmv4SFd.js";var _,v,y,b,x,S,C=e((()=>{h(),p(),c(),_=t(a()),n(),v=o(),y=i(l)`
  width: 100%;
  justify-content: space-between;
`,b=i(l)`
  gap: 8px;
`,x=i(l)`
  width: 24px;
`,S=({account:e,onClickGoBack:t})=>{let n=r(),[i,a]=(0,_.useState)(``),o=(0,_.useMemo)(()=>i===``?``:`(${m(i,4)})`,[i]);return(0,_.useEffect)(()=>{e&&e.getAddress(`g`).then(a)},[e]),(0,v.jsxs)(y,{children:[(0,v.jsx)(u,{onClick:t,style:{padding:4,backgroundColor:n.webInput._100,borderRadius:16},children:(0,v.jsx)(d,{src:g,size:24})}),e&&(0,v.jsxs)(b,{children:[(0,v.jsx)(f,{type:`title4`,children:e.name}),(0,v.jsx)(f,{type:`body4`,color:n.webNeutral._600,style:{lineHeight:`22px`},children:o}),(0,v.jsx)(s,{size:20,copyText:i})]}),(0,v.jsx)(x,{})]})},S.__docgenInfo={description:``,methods:[],displayName:`WebMainAccountHeader`,props:{account:{required:!0,tsType:{name:`union`,raw:`Account | null`,elements:[{name:`Account`},{name:`null`}]},description:``},onClickGoBack:{required:!0,tsType:{name:`signature`,type:`function`,raw:`() => void`,signature:{arguments:[],return:{name:`void`}}},description:``}}}})),w,T,E,D,O;e((()=>{C(),{action:w}=__STORYBOOK_MODULE_ACTIONS__,T={title:`components/pages/WebMainAccountHeader`,component:S},E={id:`id`,index:1,type:`HD_WALLET`,name:`name`,keyringId:`keyringId`,publicKey:[],toData:()=>({index:1,type:`HD_WALLET`,name:`name`,keyringId:`keyringId`,publicKey:[]}),getAddress:async()=>`g1jg8mtutu9khhfwc4nxmuhcpftf0pajdhfvsqf5`},D={args:{account:E,onClickGoBack:w(`click back`)}},D.parameters={...D.parameters,docs:{...D.parameters?.docs,source:{originalSource:`{
  args: {
    account: mockAccount,
    onClickGoBack: action('click back')
  }
}`,...D.parameters?.docs?.source}}},O=[`Default`]}))();export{D as Default,O as __namedExportsOrder,T as default};