import{c as e,i as t}from"./_polyfill-node.global-CL4hvcq6.js";import{_ as n,a as r,g as i,i as a,n as o,r as s,rt as c,t as l}from"./iframe-DekVl-_p.js";import{h as u,t as d}from"./atoms-DPNcwsZr.js";import{r as f}from"./base-D2xGt4mF.js";var p,m=t((()=>{d(),a(),n(),p=i(f)`
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
`})),h,g,_,v=t((()=>{d(),a(),h=e(c()),m(),g=l(),_=({keyword:e,onChangeKeyword:t,errorMessage:n})=>{let i=(0,h.useMemo)(()=>!!n,[n]);return(0,g.jsxs)(p,{children:[(0,g.jsx)(`input`,{className:i?`search-input error`:`search-input`,value:e,onChange:e=>t(e.target.value),placeholder:`Search`}),i&&(0,g.jsx)(u,{className:`error-message`,type:`body2Reg`,color:r.red._5,children:n})]})},_.__docgenInfo={description:``,methods:[],displayName:`AdditionalTokenPathInput`,props:{keyword:{required:!0,tsType:{name:`string`},description:``},onChangeKeyword:{required:!0,tsType:{name:`signature`,type:`function`,raw:`(keyword: string) => void`,signature:{arguments:[{type:{name:`string`},name:`keyword`}],return:{name:`void`}}},description:``},errorMessage:{required:!0,tsType:{name:`union`,raw:`string | null`,elements:[{name:`string`},{name:`null`}]},description:``}}}}));export{v as n,_ as t};