import{j as m}from"./global-style-Be4sOX77.js";import{n as _,r as e,l as x,d as y,m as C}from"./theme-D2qI5cuM.js";import{V as H}from"./index-CLRA8FOO.js";import{W as k}from"./index-jlviZXHb.js";import"./index-BAMY2Nnw.js";const T=C`
  from {
   width: 0;
  }
  to {
   width: 100%;
  }
`,E=y(H)`
  position: relative;
  overflow: hidden;
  display: flex;
  height: 32px;
  padding: 8px 16px;
  justify-content: center;
  align-items: center;
  border-radius: 8px;
  background: transparent;
  cursor: pointer;
  user-select: none;
  box-shadow: 0 0 0 1px #212429 inset;

  ${({pressed:a,finish:t})=>a||t?x`
          box-shadow:
            0 0 0 1px #1e3c71 inset,
            0px 2px 16px 4px rgba(0, 89, 255, 0.24),
            0px 1px 3px 0px rgba(0, 0, 0, 0.1),
            0px 1px 2px 0px rgba(0, 0, 0, 0.06);
          background: ${t?"#0059ff52":"transparent"};
          ::before {
            content: '';
            z-index: -1;
            position: absolute;
            top: 0px;
            left: 0px;
            height: 100%;
            background: ${t?"transparent":"#0059ff52"};
            border-radius: 8px;
            animation: ${T} 3s forwards;
            box-shadow: ${t?"none":"0 0 0 1px #1E3C71 inset"};
          }
        `:x`
          &:hover {
            background: #ffffff14;
            box-shadow: 0 0 0 1px #ffffff14 inset;
          }
        `}
`,b=({width:a="fit-content",height:t=32,text:h="Hold to Reveal",onFinishHold:l})=>{const u=_(),[s,p]=e.useState(!1),[g,i]=e.useState(!1),[o,d]=e.useState(!1),r=e.useCallback(()=>{i(!1),s&&p(!1)},[s]),w=e.useCallback(()=>{if(o){d(!1);return}i(!0),p(!0)},[o,r]),v=e.useCallback(()=>{i(!0)},[]),S=e.useCallback(()=>{r()},[r]),c=e.useCallback(()=>{r()},[r]);return e.useEffect(()=>{l(o)},[o]),e.useEffect(()=>{let f;return s&&(f=setTimeout(()=>{d(!0)},3e3)),()=>{clearTimeout(f)}},[s,l]),m.jsx(E,{style:{width:a,height:t},pressed:s,finish:o,onMouseDown:w,onMouseUp:S,onMouseOver:v,onMouseLeave:c,onMouseOut:c,children:m.jsx(k,{color:g||o?u.webNeutral._100:u.webNeutral._500,type:"title6",children:h})})};b.__docgenInfo={description:"",methods:[],displayName:"WebHoldButton",props:{width:{required:!1,tsType:{name:"CSSProperties['width']",raw:"CSSProperties['width']"},description:"",defaultValue:{value:"'fit-content'",computed:!1}},height:{required:!1,tsType:{name:"CSSProperties['height']",raw:"CSSProperties['height']"},description:"",defaultValue:{value:"32",computed:!1}},text:{required:!1,tsType:{name:"string"},description:"",defaultValue:{value:"'Hold to Reveal'",computed:!1}},onFinishHold:{required:!0,tsType:{name:"signature",type:"function",raw:"(result: boolean) => void",signature:{arguments:[{type:{name:"boolean"},name:"result"}],return:{name:"void"}}},description:""}}};const{action:O}=__STORYBOOK_MODULE_ACTIONS__,V={title:"components/atoms/WebHoldButton",component:b},n={args:{onFinishHold:O("onFinishHold")}};n.parameters={...n.parameters,docs:{...n.parameters?.docs,source:{originalSource:`{
  args: {
    onFinishHold: action('onFinishHold')
  }
}`,...n.parameters?.docs?.source}}};const W=["Default"];export{n as Default,W as __namedExportsOrder,V as default};
