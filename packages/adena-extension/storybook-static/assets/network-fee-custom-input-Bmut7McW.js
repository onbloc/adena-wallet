import{n as e,o as t}from"./chunk-zsgVPwQN.js";import{_ as n,c as r,g as i,i as a,n as o,r as s,rt as c,s as l,t as u}from"./iframe-BclzClxJ.js";var d,f,p=e((()=>{l(),a(),n(),d=i.div`
  ${r.flex({direction:`column`,justify:`flex-start`,align:`flex-start`})};
  width: 100%;
  gap: 4px;

  .description {
    padding: 0 16px;
    ${o.captionReg};
    height: 14px;
    color: ${s(`neutral`,`_1`)};
  }
`,f=i.div`
  ${r.flex({direction:`row`,justify:`space-between`})};
  width: 100%;
  padding: 14px 16px;
  background-color: ${s(`neutral`,`_9`)};
  border: 1px solid ${s(`neutral`,`_7`)};
  border-radius: 30px;

  & .fee-input {
    ${r.flex({direction:`row`})};
    width: 100%;
    ${o.body2Reg};
  }

  & .denom {
    ${r.flex({direction:`row`})};
    flex-shrink: 0;
    ${s(`neutral`,`_1`)};
    ${o.light13}
  }

  & .description {
    position: relative;
    padding: 0 16px;
    ${o.captionReg};
    height: 14px;
    color: ${s(`neutral`,`_1`)};
  }
`})),m,h,g,_=e((()=>{m=t(c()),p(),h=u(),g=({value:e,changeValue:t})=>{let[n,r]=(0,m.useState)(e);return(0,h.jsxs)(d,{children:[(0,h.jsx)(`span`,{className:`description`,children:`Network Fee Multiplier`}),(0,h.jsx)(f,{children:(0,h.jsx)(`input`,{className:`fee-input`,type:`number`,value:n,onChange:e=>{r(e.target.value)},onBlur:()=>{r(t(n))},placeholder:`Enter Custom Network Fee`})})]})},g.__docgenInfo={description:``,methods:[],displayName:`NetworkFeeCustomInput`,props:{value:{required:!0,tsType:{name:`string`},description:``},changeValue:{required:!0,tsType:{name:`signature`,type:`function`,raw:`(value: string) => string`,signature:{arguments:[{type:{name:`string`},name:`value`}],return:{name:`string`}}},description:``}}}}));export{_ as n,g as t};