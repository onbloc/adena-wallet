import{i as e}from"./_polyfill-node.global-CL4hvcq6.js";import{_ as t,c as n,g as r,i,n as a,r as o,rt as s,s as c,t as l}from"./iframe-DekVl-_p.js";var u,d=e((()=>{c(),i(),t(),u=r.div`
  ${n.flex({align:`normal`,justify:`normal`})};
  width: 100%;
  height: auto;

  .input-wrapper {
    ${n.flex({direction:`row`,justify:`normal`})};
    width: 100%;
    min-height: 48px;
    padding: 12px 16px;
    ${a.body2Reg};
    background-color: ${o(`neutral`,`_9`)};
    border: 1px solid ${o(`neutral`,`_7`)};
    border-radius: 30px;

    .amount-input {
      width: 100%;
    }

    .denom {
      margin: 0 8px;
    }

    .max-button {
      display: inline-flex;
      flex-shrink: 0;
      width: 64px;
      height: 24px;
      border-radius: 12px;
      background-color: ${o(`neutral`,`_7`)};
      align-items: center;
      justify-content: center;
      transition: 0.2s;

      &:hover {
        background-color: ${o(`neutral`,`b`)};
      }
    }
  }

  .description {
    position: relative;
    padding: 0 16px;
    ${a.captionReg};
    color: ${o(`neutral`,`a`)};
  }

  &.error {
    .input-wrapper {
      border-color: ${o(`red`,`_5`)};
    }

    .description {
      color: ${o(`red`,`_5`)};
    }
  }
`})),f,p,m=e((()=>{s(),d(),f=l(),p=({hasError:e,amount:t,denom:n,description:r,onChangeAmount:i,onClickMax:a})=>(0,f.jsxs)(u,{className:e?`error`:``,children:[(0,f.jsxs)(`div`,{className:`input-wrapper`,children:[(0,f.jsx)(`input`,{className:`amount-input`,type:`number`,value:t,autoComplete:`off`,onChange:e=>i(e.target.value),placeholder:`Amount`}),(0,f.jsx)(`span`,{className:`denom`,children:n}),(0,f.jsx)(`button`,{className:`max-button`,onClick:a,children:`Max`})]}),(0,f.jsx)(`span`,{className:`description`,children:r})]}),p.__docgenInfo={description:``,methods:[],displayName:`BalanceInput`,props:{hasError:{required:!0,tsType:{name:`boolean`},description:``},amount:{required:!0,tsType:{name:`string`},description:``},denom:{required:!0,tsType:{name:`string`},description:``},description:{required:!0,tsType:{name:`string`},description:``},onChangeAmount:{required:!0,tsType:{name:`signature`,type:`function`,raw:`(value: string) => void`,signature:{arguments:[{type:{name:`string`},name:`value`}],return:{name:`void`}}},description:``},onClickMax:{required:!0,tsType:{name:`signature`,type:`function`,raw:`() => void`,signature:{arguments:[],return:{name:`void`}}},description:``}}}}));export{m as n,p as t};