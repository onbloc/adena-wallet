import{i as e}from"./_polyfill-node.global-CL4hvcq6.js";import{_ as t,c as n,g as r,i,n as a,r as o,rt as s,s as c,t as l}from"./iframe-DekVl-_p.js";import{d as u,t as d}from"./atoms-DPNcwsZr.js";import{n as f,t as p}from"./manage-token-search-Bn83MTvU.js";var m,h=e((()=>{c(),i(),t(),m=r.div`
  ${n.flex({direction:`row`,justify:`flex-start`})};
  width: 100%;
  height: 48px;
  padding: 12px 16px;
  background-color: ${o(`neutral`,`_9`)};
  border-radius: 30px;
  border: 1px solid ${o(`neutral`,`_7`)};

  .search-icon-wrapper {
    display: inline-flex;
    flex-shrink: 0;
    width: fit-content;
    align-items: center;
    padding: 0 5px;

    .search {
      width: 17px;
      height: 17px;
    }
  }

  .input-wrapper {
    display: inline-flex;
    flex-shrink: 1;
    width: 100%;
    height: 24px;
    padding: 0 12px;

    .search-input {
      width: 100%;
      ${a.body2Reg};
    }
  }

  .added-icon-wrapper {
    display: inline-flex;
    flex-shrink: 0;
    width: 24px;
    height: 24px;
    align-items: center;
    cursor: pointer;

    .added {
      width: 100%;
      height: 100%;
      fill: ${o(`neutral`,`_7`)};
      transition: 0.2s;
    }

    &:hover {
      .added {
        fill: ${o(`neutral`,`b`)};
      }
    }
  }
`})),g,_,v=e((()=>{p(),d(),s(),h(),g=l(),_=({keyword:e,onChangeKeyword:t,onClickAdded:n})=>(0,g.jsxs)(m,{children:[(0,g.jsx)(`div`,{className:`search-icon-wrapper`,children:(0,g.jsx)(`img`,{className:`search`,src:f,alt:`search icon`})}),(0,g.jsx)(`div`,{className:`input-wrapper`,children:(0,g.jsx)(`input`,{className:`search-input`,value:e,onChange:e=>t(e.target.value),placeholder:`Search`})}),(0,g.jsx)(`div`,{className:`added-icon-wrapper`,onClick:n,children:(0,g.jsx)(u,{className:`added`,name:`iconTokenAdded`})})]}),_.__docgenInfo={description:``,methods:[],displayName:`ManageTokenSearchInput`,props:{keyword:{required:!0,tsType:{name:`string`},description:``},onChangeKeyword:{required:!0,tsType:{name:`signature`,type:`function`,raw:`(keyword: string) => void`,signature:{arguments:[{type:{name:`string`},name:`keyword`}],return:{name:`void`}}},description:``},onClickAdded:{required:!0,tsType:{name:`signature`,type:`function`,raw:`() => void`,signature:{arguments:[],return:{name:`void`}}},description:``}}}}));export{v as n,_ as t};