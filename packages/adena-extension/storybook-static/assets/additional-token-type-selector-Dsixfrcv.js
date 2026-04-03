import{n as e,o as t}from"./chunk-zsgVPwQN.js";import{_ as n,g as r,i,n as a,r as o,rt as s,t as c}from"./iframe-BclzClxJ.js";import{t as l}from"./atoms-kch4SvDy.js";import{n as u,r as d}from"./base-Cfud_vLb.js";var f,p,m=e((()=>{l(),i(),n(),f=r(u)`
  display: flex;
  width: 100%;
  height: 48px;
  padding: 5px;
  gap: 10px;
  justify-content: center;
  align-items: center;
  border-radius: 30px;
  background-color: ${o(`neutral`,`_9`)};
`,p=r(d)`
  display: flex;
  width: 100%;
  height: 100%;
  justify-content: center;
  align-items: center;
  border-radius: 30px;
  color: ${o(`neutral`,`a`)};
  ${a.body2Reg}
  cursor: pointer;

  &.selected {
    color: ${o(`neutral`,`_1`)};
    background-color: ${o(`neutral`,`_7`)};
  }
`})),h,g,_,v,y,b=e((()=>{h=t(s()),m(),g=c(),_=function(e){return e[e.SEARCH=0]=`SEARCH`,e[e.MANUAL=1]=`MANUAL`,e}({}),v={[_.SEARCH]:`Search`,[_.MANUAL]:`Manual`},y=({type:e,setType:t})=>{let n=[_.SEARCH,_.MANUAL],r=(0,h.useCallback)(n=>{n!==e&&t(n)},[e]);return(0,g.jsx)(f,{children:n.map((t,n)=>(0,g.jsx)(p,{className:t===e?`selected`:``,onClick:()=>r(t),children:v[t]},n))})},y.__docgenInfo={description:``,methods:[],displayName:`AdditionalTokenTypeSelector`,props:{type:{required:!0,tsType:{name:`AddingType`},description:``},setType:{required:!0,tsType:{name:`signature`,type:`function`,raw:`(type: AddingType) => void`,signature:{arguments:[{type:{name:`AddingType`},name:`type`}],return:{name:`void`}}},description:``}}}}));export{y as n,b as r,_ as t};