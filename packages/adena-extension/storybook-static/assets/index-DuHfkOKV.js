import{j as p}from"./global-style-Be4sOX77.js";import{r as s,w as h,l as n,d as u}from"./theme-D2qI5cuM.js";import{R as f,V as m}from"./index-CLRA8FOO.js";const $=u(f).withConfig({shouldForwardProp:e=>!["hover","focus","filled","error"].includes(e)})`
  width: 100%;
  height: 40px;
  position: relative;
  overflow: hidden;
  border-radius: 10px;
  border: 1px solid ${({theme:e})=>e.webNeutral._800};
  ${h.body4}

  ${({theme:e,hover:r,focus:o,filled:t})=>r||o||t?n`
          border-color: ${e.webNeutral._600};
        `:""}
  
  ${({filled:e})=>e?n`
          box-shadow:
            0px 0px 0px 3px rgba(255, 255, 255, 0.04),
            0px 1px 3px 0px rgba(0, 0, 0, 0.1),
            0px 1px 2px 0px rgba(0, 0, 0, 0.06);
        `:""}

  ${({theme:e,error:r})=>r?n`
          background: #e0517014;
          border-color: ${e.webError._200};
          box-shadow:
            0px 0px 0px 3px rgba(235, 84, 94, 0.12),
            0px 1px 3px 0px rgba(0, 0, 0, 0.1),
            0px 1px 2px 0px rgba(0, 0, 0, 0.06);
        `:""}
`,y=u(m).withConfig({shouldForwardProp:e=>!["hover","focus","filled","error"].includes(e)})`
  width: 40px;
  height: 100%;
  background: ${({theme:e})=>e.webInput._100};
  border-right: 1px solid ${({theme:e})=>e.webNeutral._800};
  align-items: center;
  justify-content: center;
  color: ${({theme:e})=>e.webNeutral._500};

  ${({theme:e,hover:r,focus:o})=>r||o?n`
          border-color: ${e.webNeutral._600};
        `:""}

  ${({theme:e,error:r})=>r?n`
          color: ${e.webError._100};
          background: rgba(224, 81, 112, 0.08);
          border-color: ${e.webError._200};
        `:""}
`,_=u.input.withConfig({shouldForwardProp:e=>!["hover","focus","filled","error"].includes(e)})`
  flex: 1;
  width: 100%;
  height: 40px;
  padding: 12px;
  border-radius: 0;
  border: none;
  outline: none;
  box-shadow: none;
  background: ${({error:e,theme:r})=>e?r.webError._300:r.webNeutral._900};
  color: ${({theme:e})=>e.webNeutral._100};
`,v=({type:e,index:r,value:o,error:t,onChange:l})=>{const[i,c]=s.useState(!1),[a,x]=s.useState(!1),d=s.useMemo(()=>o.length>0,[o]),b=s.useCallback(g=>{const w=g.target.value;l(w)},[l]);return p.jsxs($,{type:e,hover:i,focus:a,filled:d,error:t,onMouseOver:()=>c(!0),onMouseOut:()=>c(!1),children:[p.jsx(y,{hover:i,focus:a,filled:d,error:t,children:r}),p.jsx(_,{hover:i,focus:a,filled:d,value:o,onFocus:()=>x(!0),onBlur:()=>x(!1),onChange:b,error:t})]})};v.__docgenInfo={description:"",methods:[],displayName:"WebSeedInputItem",props:{type:{required:!0,tsType:{name:"string"},description:""},index:{required:!0,tsType:{name:"number"},description:""},value:{required:!0,tsType:{name:"string"},description:""},error:{required:!0,tsType:{name:"boolean"},description:""},onChange:{required:!0,tsType:{name:"signature",type:"function",raw:"(value: string) => void",signature:{arguments:[{type:{name:"string"},name:"value"}],return:{name:"void"}}},description:""}}};export{v as W};
