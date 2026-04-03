import{j as t}from"./global-style-Be4sOX77.js";import{d as s,m as p,r as a,R as u}from"./theme-D2qI5cuM.js";import{W as y}from"./web-help-tooltip-B4KmohBK.js";import"./index-BAMY2Nnw.js";import"./index-Ct-w3XHB.js";import"./index-CulhM7-u.js";import"./index-CLRA8FOO.js";import"./index-DrT1707K.js";import"./index-DjFTnIrN.js";import"./index-DacC881Y.js";import"./bignumber-B1z4pYDt.js";import"./index-BxhAeZbh.js";import"./index-CpLq81TF.js";import"./index-B3tmVslE.js";import"./index-jlviZXHb.js";import"./index-Bv2zqv-E.js";import"./index-g6zNktBg.js";import"./index-C6Pb5J-W.js";import"./index-C0j4FPrl.js";import"./lodash-BU2fF3dy.js";const x=s.div`
  position: fixed;
  display: flex;
  flex-direction: column;
  width: 100vw;
  height: 100vh;
  top: 0;
  left: 0;
  z-index: 99;
  background: #00000080;
`,f=p`
  0% {
    opacity: 0;
  }
  100% {
    opacity: 1;
  }
`,b=p`
  0% {
    opacity: 1;
  }
  100% {
    opacity: 0;
  }
`,v=s.div`
  position: absolute;
  display: flex;
  flex-direction: column;
  top: ${({y:n})=>`${n}px`};
  left: ${({x:n})=>`${n}px`};
  opacity: 0;
  animation-duration: 0.4s;
  animation-timing-function: ease-in-out;
  animation-direction: alternate;
  animation-fill-mode: both;
  animation-name: ${b};

  &.visible {
    animation-name: ${f};
  }
`,c=({items:n,onFinish:m})=>{const[i,l]=a.useState(0),d=a.useCallback(()=>{if(!(i+1<n.length)){m();return}l(e=>e+1)},[i,n]);return t.jsx(x,{children:n.map((o,e)=>e<=i?t.jsx(v,{className:e===i?"visible":"",x:o.x,y:o.y,children:t.jsx(y,{securityRate:o.tooltipInfo.securityRate,convenienceRate:o.tooltipInfo.convenienceRate,position:o.position,confirm:d,children:o.tooltipInfo.content})},e):t.jsx(u.Fragment,{},e))})};c.__docgenInfo={description:"",methods:[],displayName:"WebHelpOverlay",props:{items:{required:!0,tsType:{name:"Array",elements:[{name:"OverlayItem"}],raw:"OverlayItem[]"},description:""},onFinish:{required:!0,tsType:{name:"signature",type:"function",raw:"() => void",signature:{arguments:[],return:{name:"void"}}},description:""}}};const{action:h}=__STORYBOOK_MODULE_ACTIONS__,z={title:"components/molecules/WebHelpOverlay",component:c},r={args:{items:[{position:"bottom",x:5,y:5,tooltipInfo:{securityRate:2,convenienceRate:2,content:t.jsxs(t.Fragment,{children:["1. ",t.jsx("b",{children:"Tooltip"})]})}},{x:15,y:5,position:"bottom",tooltipInfo:{securityRate:2,convenienceRate:2,content:t.jsxs(t.Fragment,{children:["2. ",t.jsx("b",{children:"Tooltip"})]})}},{x:25,y:5,position:"bottom",tooltipInfo:{securityRate:2,convenienceRate:2,content:t.jsxs(t.Fragment,{children:["3. ",t.jsx("b",{children:"Tooltip"})]})}}],onFinish:h("finish")}};r.parameters={...r.parameters,docs:{...r.parameters?.docs,source:{originalSource:`{
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
}`,...r.parameters?.docs?.source}}};const B=["Default"];export{r as Default,B as __namedExportsOrder,z as default};
