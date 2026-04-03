import{i as e}from"./_polyfill-node.global-CL4hvcq6.js";import{_ as t,c as n,g as r,i,n as a,r as o,rt as s,s as c,t as l}from"./iframe-DekVl-_p.js";import{n as u,t as d}from"./token-list-item-balance-BL5FPQRE.js";var f,p=e((()=>{c(),i(),t(),f=r.div`
  ${n.flex({direction:`row`,justify:`flex-start`})};
  padding: 13px;
  width: 100%;
  height: auto;
  background: ${o(`neutral`,`_9`)};
  border-radius: 18px;
  transition: 0.2s;

  & + & {
    margin-top: 12px;
  }

  &:hover {
    background: ${o(`neutral`,`_7`)};
    cursor: pointer;
  }

  .logo-wrapper {
    display: inline-flex;
    flex-shrink: 0;
    width: 34px;
    height: 34px;
    margin-right: 12px;

    .logo {
      width: 100%;
      height: 100%;
      border-radius: 50%;
    }
  }

  .name-wrapper {
    display: inline-flex;
    width: 100%;
    flex-shrink: 1;
    align-items: center;
    height: 21px;

    .name {
      display: contents;
      ${a.body2Bold};
      line-height: 17px;
    }
  }

  .balance-wrapper {
    display: inline-flex;
    flex-shrink: 0;
    width: fit-content;
    height: 21px;
    line-height: 17px;
    align-items: flex-start;
    justify-content: flex-end;
  }
`})),m,h,g=e((()=>{u(),s(),p(),m=l(),h=({token:e,completeImageLoading:t,onClickTokenItem:n})=>{let{tokenId:r,logo:i,name:a,balanceAmount:o}=e,s=()=>{t(i)};return(0,m.jsxs)(f,{onClick:()=>n(r),children:[(0,m.jsx)(`div`,{className:`logo-wrapper`,children:(0,m.jsx)(`img`,{className:`logo`,src:i,onLoad:s,onError:s,loading:`eager`,decoding:`sync`,alt:`token img`})}),(0,m.jsx)(`div`,{className:`name-wrapper`,children:(0,m.jsx)(`span`,{className:`name`,children:a})}),(0,m.jsx)(`div`,{className:`balance-wrapper`,children:(0,m.jsx)(d,{amount:o})})]})},h.__docgenInfo={description:``,methods:[],displayName:`TokenListItem`,props:{token:{required:!0,tsType:{name:`MainToken`},description:``},completeImageLoading:{required:!0,tsType:{name:`signature`,type:`function`,raw:`(imageUrl: string) => void`,signature:{arguments:[{type:{name:`string`},name:`imageUrl`}],return:{name:`void`}}},description:``},onClickTokenItem:{required:!0,tsType:{name:`signature`,type:`function`,raw:`(tokenId: string) => void`,signature:{arguments:[{type:{name:`string`},name:`tokenId`}],return:{name:`void`}}},description:``}}}}));export{g as n,h as t};