import{n as e,o as t}from"./chunk-zsgVPwQN.js";import{_ as n,g as r,rt as i,t as a,y as o}from"./iframe-BclzClxJ.js";import{n as s,t as c}from"./web-help-tooltip-osfxvHFC.js";var l,u,d,f,p=e((()=>{n(),l=r.div`
  position: fixed;
  display: flex;
  flex-direction: column;
  width: 100vw;
  height: 100vh;
  top: 0;
  left: 0;
  z-index: 99;
  background: #00000080;
`,u=o`
  0% {
    opacity: 0;
  }
  100% {
    opacity: 1;
  }
`,d=o`
  0% {
    opacity: 1;
  }
  100% {
    opacity: 0;
  }
`,f=r.div`
  position: absolute;
  display: flex;
  flex-direction: column;
  top: ${({y:e})=>`${e}px`};
  left: ${({x:e})=>`${e}px`};
  opacity: 0;
  animation-duration: 0.4s;
  animation-timing-function: ease-in-out;
  animation-direction: alternate;
  animation-fill-mode: both;
  animation-name: ${d};

  &.visible {
    animation-name: ${u};
  }
`})),m,h,g,_=e((()=>{m=t(i()),s(),p(),h=a(),g=({items:e,onFinish:t})=>{let[n,r]=(0,m.useState)(0),i=(0,m.useCallback)(()=>{if(!(n+1<e.length)){t();return}r(e=>e+1)},[n,e]);return(0,h.jsx)(l,{children:e.map((e,t)=>t<=n?(0,h.jsx)(f,{className:t===n?`visible`:``,x:e.x,y:e.y,children:(0,h.jsx)(c,{securityRate:e.tooltipInfo.securityRate,convenienceRate:e.tooltipInfo.convenienceRate,position:e.position,confirm:i,children:e.tooltipInfo.content})},t):(0,h.jsx)(m.Fragment,{},t))})},g.__docgenInfo={description:``,methods:[],displayName:`WebHelpOverlay`,props:{items:{required:!0,tsType:{name:`Array`,elements:[{name:`OverlayItem`}],raw:`OverlayItem[]`},description:``},onFinish:{required:!0,tsType:{name:`signature`,type:`function`,raw:`() => void`,signature:{arguments:[],return:{name:`void`}}},description:``}}}})),v,y,b,x,S;e((()=>{i(),_(),v=a(),{action:y}=__STORYBOOK_MODULE_ACTIONS__,b={title:`components/molecules/WebHelpOverlay`,component:g},x={args:{items:[{position:`bottom`,x:5,y:5,tooltipInfo:{securityRate:2,convenienceRate:2,content:(0,v.jsxs)(v.Fragment,{children:[`1. `,(0,v.jsx)(`b`,{children:`Tooltip`})]})}},{x:15,y:5,position:`bottom`,tooltipInfo:{securityRate:2,convenienceRate:2,content:(0,v.jsxs)(v.Fragment,{children:[`2. `,(0,v.jsx)(`b`,{children:`Tooltip`})]})}},{x:25,y:5,position:`bottom`,tooltipInfo:{securityRate:2,convenienceRate:2,content:(0,v.jsxs)(v.Fragment,{children:[`3. `,(0,v.jsx)(`b`,{children:`Tooltip`})]})}}],onFinish:y(`finish`)}},x.parameters={...x.parameters,docs:{...x.parameters?.docs,source:{originalSource:`{
  args: {
    items: [{
      position: 'bottom',
      x: 5,
      y: 5,
      tooltipInfo: {
        securityRate: 2,
        convenienceRate: 2,
        content: <>
              1. <b>Tooltip</b>
            </>
      }
    }, {
      x: 15,
      y: 5,
      position: 'bottom',
      tooltipInfo: {
        securityRate: 2,
        convenienceRate: 2,
        content: <>
              2. <b>Tooltip</b>
            </>
      }
    }, {
      x: 25,
      y: 5,
      position: 'bottom',
      tooltipInfo: {
        securityRate: 2,
        convenienceRate: 2,
        content: <>
              3. <b>Tooltip</b>
            </>
      }
    }],
    onFinish: action('finish')
  }
}`,...x.parameters?.docs?.source}}},S=[`Default`]}))();export{x as Default,S as __namedExportsOrder,b as default};