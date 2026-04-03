import{i as e}from"./_polyfill-node.global-CL4hvcq6.js";import{_ as t,c as n,g as r,i,n as a,r as o,rt as s,s as c,t as l}from"./iframe-DekVl-_p.js";import{n as u,t as d}from"./manage-token-search-Bn83MTvU.js";var f,p=e((()=>{c(),i(),t(),f=r.div`
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
`})),m,h,g=e((()=>{d(),s(),p(),m=l(),h=({keyword:e,onChangeKeyword:t})=>(0,m.jsxs)(f,{children:[(0,m.jsx)(`div`,{className:`search-icon-wrapper`,children:(0,m.jsx)(`img`,{className:`search`,src:u,alt:`search icon`})}),(0,m.jsx)(`div`,{className:`input-wrapper`,children:(0,m.jsx)(`input`,{className:`search-input`,value:e,onChange:e=>t(e.target.value),placeholder:`Search`})})]}),h.__docgenInfo={description:``,methods:[],displayName:`ManageCollectionSearchInput`,props:{keyword:{required:!0,tsType:{name:`string`},description:``},onChangeKeyword:{required:!0,tsType:{name:`signature`,type:`function`,raw:`(keyword: string) => void`,signature:{arguments:[{type:{name:`string`},name:`keyword`}],return:{name:`void`}}},description:``}}}}));export{g as n,h as t};