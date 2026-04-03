import{n as e,o as t}from"./chunk-zsgVPwQN.js";import{_ as n,a as r,g as i,i as a,n as o,r as s,rt as c,t as l}from"./iframe-BclzClxJ.js";import{h as u,t as d}from"./atoms-kch4SvDy.js";import{r as f}from"./base-Cfud_vLb.js";var p,m=e((()=>{d(),a(),n(),p=i(f)`
  width: 100%;

  .search-input {
    height: 48px;
    padding: 13px 16px;
    background-color: ${s(`neutral`,`_9`)};
    border: 1px solid ${s(`neutral`,`_7`)};
    color: ${s(`neutral`,`_1`)};
    border-radius: 30px;
    ${o.body2Reg};

    &.error {
      border-color: ${s(`red`,`_5`)};
    }
  }

  .error-message {
    padding: 0 8px;
    height: 18px;
  }
`})),h,g,_,v=e((()=>{d(),a(),h=t(c()),m(),g=l(),_=({keyword:e,onChangeKeyword:t,errorMessage:n})=>{let i=(0,h.useMemo)(()=>!!n,[n]);return(0,g.jsxs)(p,{children:[(0,g.jsx)(`input`,{className:i?`search-input error`:`search-input`,value:e,onChange:e=>t(e.target.value),placeholder:`Search`}),i&&(0,g.jsx)(u,{className:`error-message`,type:`body2Reg`,color:r.red._5,children:n})]})},_.__docgenInfo={description:``,methods:[],displayName:`AdditionalTokenPathInput`,props:{keyword:{required:!0,tsType:{name:`string`},description:``},onChangeKeyword:{required:!0,tsType:{name:`signature`,type:`function`,raw:`(keyword: string) => void`,signature:{arguments:[{type:{name:`string`},name:`keyword`}],return:{name:`void`}}},description:``},errorMessage:{required:!0,tsType:{name:`union`,raw:`string | null`,elements:[{name:`string`},{name:`null`}]},description:``}}}}));export{v as n,_ as t};