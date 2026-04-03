import{n as e,o as t}from"./chunk-zsgVPwQN.js";import{_ as n,c as r,g as i,i as a,n as o,r as s,rt as c,s as l,t as u}from"./iframe-BclzClxJ.js";var d,f=e((()=>{l(),a(),n(),d=i.div`
  ${r.flex({align:`normal`,justify:`normal`})};
  width: 100%;
  height: 100%;

  .input-wrapper {
    ${r.flex({align:`normal`,justify:`normal`})};
    width: 100%;

    .input-box {
      ${r.flex({direction:`row`,justify:`normal`})};
      width: 100%;
      min-height: 48px;
      padding: 12px 16px;
      ${o.body2Reg};
      background-color: ${s(`neutral`,`_9`)};
      border: 1px solid ${s(`neutral`,`_7`)};
      border-radius: 30px;
      margin-top: 12px;

      &:first-child {
        margin-top: 0;
      }

      input {
        display: flex;
        width: 100%;
        height: auto;
        resize: none;
        overflow: hidden;
        line-height: 25px;

        ::placeholder {
          color: ${s(`neutral`,`a`)};
        }

        &:read-only {
          color: ${s(`neutral`,`a`)};
        }
      }
    }
  }

  .error-message {
    position: relative;
    padding: 0 16px;
    ${o.captionReg};
    font-size: 13px;
    height: 14px;
    color: ${s(`red`,`_5`)};
  }
`})),p,m,h,g=e((()=>{p=t(c()),f(),m=u(),h=({name:e,rpcUrl:t,indexerUrl:n,chainId:r,rpcUrlError:i,indexerUrlError:a,chainIdError:o,editType:s,changeName:c,changeRPCUrl:l,changeIndexerUrl:u,changeChainId:f})=>{let h=(0,p.useMemo)(()=>s===`rpc-only`,[s]),g=(0,p.useMemo)(()=>!1,[s]),_=(0,p.useMemo)(()=>s===`rpc-only`,[s]),v=(0,p.useMemo)(()=>s===`rpc-only`,[s]),y=(0,p.useCallback)(e=>{c(e.target.value)},[]),b=(0,p.useCallback)(e=>{l(e.target.value.replace(/ /g,``))},[]),x=(0,p.useCallback)(e=>{u(e.target.value.replace(/ /g,``))},[]),S=(0,p.useCallback)(e=>{f(e.target.value.replace(/ /g,``))},[]);return(0,m.jsx)(d,{children:(0,m.jsxs)(`div`,{className:`input-wrapper`,children:[(0,m.jsx)(`div`,{className:`input-box`,children:(0,m.jsx)(`input`,{type:`text`,value:e,autoComplete:`off`,onChange:y,placeholder:`Network Name`,readOnly:h})}),(0,m.jsx)(`div`,{className:`input-box`,children:(0,m.jsx)(`input`,{type:`text`,value:t,autoComplete:`off`,onChange:b,placeholder:`RPC URL`,readOnly:g})}),i&&(0,m.jsx)(`span`,{className:`error-message`,children:i}),(0,m.jsx)(`div`,{className:`input-box`,children:(0,m.jsx)(`input`,{type:`text`,value:r,autoComplete:`off`,onChange:S,placeholder:`Chain ID`,readOnly:_})}),o&&(0,m.jsx)(`span`,{className:`error-message`,children:o}),(0,m.jsx)(`div`,{className:`input-box`,children:(0,m.jsx)(`input`,{type:`text`,value:n,autoComplete:`off`,onChange:x,placeholder:`Indexer URL (Optional)`,readOnly:v})}),a&&(0,m.jsx)(`span`,{className:`error-message`,children:a})]})})},h.__docgenInfo={description:``,methods:[],displayName:`CustomNetworkInput`,props:{name:{required:!0,tsType:{name:`string`},description:``},rpcUrl:{required:!0,tsType:{name:`string`},description:``},rpcUrlError:{required:!1,tsType:{name:`string`},description:``},indexerUrl:{required:!0,tsType:{name:`string`},description:``},indexerUrlError:{required:!1,tsType:{name:`string`},description:``},chainId:{required:!0,tsType:{name:`string`},description:``},chainIdError:{required:!1,tsType:{name:`string`},description:``},editType:{required:!1,tsType:{name:`union`,raw:`'rpc-only' | 'all-default' | 'all'`,elements:[{name:`literal`,value:`'rpc-only'`},{name:`literal`,value:`'all-default'`},{name:`literal`,value:`'all'`}]},description:``},changeName:{required:!0,tsType:{name:`signature`,type:`function`,raw:`(name: string) => void`,signature:{arguments:[{type:{name:`string`},name:`name`}],return:{name:`void`}}},description:``},changeRPCUrl:{required:!0,tsType:{name:`signature`,type:`function`,raw:`(rpcUrl: string) => void`,signature:{arguments:[{type:{name:`string`},name:`rpcUrl`}],return:{name:`void`}}},description:``},changeIndexerUrl:{required:!0,tsType:{name:`signature`,type:`function`,raw:`(indexerUrl: string) => void`,signature:{arguments:[{type:{name:`string`},name:`indexerUrl`}],return:{name:`void`}}},description:``},changeChainId:{required:!0,tsType:{name:`signature`,type:`function`,raw:`(chainId: string) => void`,signature:{arguments:[{type:{name:`string`},name:`chainId`}],return:{name:`void`}}},description:``}}}}));export{g as n,h as t};