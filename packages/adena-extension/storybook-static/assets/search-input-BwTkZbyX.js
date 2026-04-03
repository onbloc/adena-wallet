import{n as e}from"./chunk-zsgVPwQN.js";import{_ as t,c as n,g as r,i,n as a,r as o,rt as s,s as c,t as l}from"./iframe-BclzClxJ.js";var u,d=e((()=>{u=`data:image/svg+xml,%3csvg%20width='15'%20height='15'%20viewBox='0%200%2015%2015'%20fill='none'%20xmlns='http://www.w3.org/2000/svg'%3e%3ccircle%20cx='7'%20cy='7'%20r='6.25'%20stroke='%23777777'%20stroke-width='1.5'/%3e%3cline%20x1='12.0607'%20y1='12'%20x2='14'%20y2='13.9393'%20stroke='%23777777'%20stroke-width='1.5'%20stroke-linecap='round'/%3e%3c/svg%3e`})),f,p=e((()=>{c(),i(),t(),f=r.div`
  ${n.flex({direction:`row`,justify:`flex-start`})};
  width: 100%;
  height: 100%;
  max-height: 48px;
  padding: 12px 16px;
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
    padding: 0 5px;

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
    }
  }
`})),m,h,g=e((()=>{d(),s(),p(),m=l(),h=({keyword:e,onChangeKeyword:t,option:n})=>(0,m.jsxs)(f,{children:[(0,m.jsx)(`div`,{className:`search-icon-wrapper`,children:(0,m.jsx)(`img`,{className:`search`,src:u,alt:`search icon`})}),(0,m.jsx)(`div`,{className:`input-wrapper`,children:(0,m.jsx)(`input`,{className:`search-input`,value:e,onChange:e=>t(e.target.value),placeholder:`Search`})}),n&&(0,m.jsx)(`div`,{className:`added-icon-wrapper`,onClick:()=>n.onClickButton(),children:n.button})]}),h.__docgenInfo={description:``,methods:[],displayName:`SearchInput`,props:{keyword:{required:!0,tsType:{name:`string`},description:``},onChangeKeyword:{required:!0,tsType:{name:`signature`,type:`function`,raw:`(keyword: string) => void`,signature:{arguments:[{type:{name:`string`},name:`keyword`}],return:{name:`void`}}},description:``},option:{required:!1,tsType:{name:`AdditionalButtonOption`},description:``}}}}));export{g as n,h as t};