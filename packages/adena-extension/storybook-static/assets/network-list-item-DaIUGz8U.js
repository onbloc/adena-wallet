import{n as e,o as t}from"./chunk-zsgVPwQN.js";import{_ as n,c as r,g as i,i as a,r as o,rt as s,s as c,t as l}from"./iframe-BclzClxJ.js";import{n as u}from"./check-circle-BwGLFhss.js";var d,f,p=e((()=>{s(),d=l(),f=({className:e})=>(0,d.jsxs)(`svg`,{className:e,width:`10`,height:`11`,viewBox:`0 0 10 11`,fill:`none`,xmlns:`http://www.w3.org/2000/svg`,children:[(0,d.jsx)(`path`,{d:`M8.16052 4.79623L3.64775 9.35447L2.99173 8.69156L3.05947 8.62311H2.16736C1.99707 8.62311 1.85774 8.48232 1.85774 8.31024V7.40876L1.7902 7.4772C1.69867 7.57106 1.63152 7.68448 1.59494 7.80963L1.15025 9.33882L2.66276 8.88906C2.76919 8.85191 2.89885 8.78346 2.99173 8.69156L3.64775 9.35447C3.44649 9.55784 3.19686 9.70841 2.924 9.78858L0.59544 10.4808C0.432501 10.5297 0.256209 10.4847 0.136036 10.3459C0.0158632 10.2423 -0.0290709 10.0643 0.0188821 9.89809L0.703809 7.54564C0.784311 7.26992 0.931963 7.01766 1.13341 6.81429L5.64482 2.25488L8.16052 4.79623Z`,fill:`#777777`}),(0,d.jsx)(`path`,{d:`M9.63785 1.63767C10.1216 2.12635 10.1216 2.91949 9.63785 3.40836L8.70124 4.35482L6.18555 1.81308L7.12216 0.866624C7.60595 0.377792 8.39162 0.377792 8.8754 0.866624L9.63785 1.63767Z`,fill:`#777777`})]}),f.__docgenInfo={description:``,methods:[],displayName:`IconEditSmall`,props:{className:{required:!1,tsType:{name:`string`},description:``}}}})),m,h=e((()=>{c(),a(),n(),m=i.div`
  ${r.flex({direction:`row`,align:`normal`,justify:`normal`})};
  width: 100%;
  height: auto;
  padding: 9px 16px;
  background-color: ${o(`neutral`,`_7`)};
  border-radius: 18px;
  transition: 0.2s;
  cursor: pointer;

  &:hover {
    background-color: ${o(`neutral`,`b`)};
  }

  .info-wrapper {
    ${r.flex({align:`normal`,justify:`normal`})};
    width: 100%;
    font-size: 12px;
    font-weight: 600;
    line-height: 21px;

    .name-wrapper {
      ${r.flex({direction:`row`,justify:`normal`})};

      .name {
        display: block;
        max-width: 236px;
        color: ${o(`neutral`,`_1`)};

        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .icon-wrapper {
        display: flex;
        margin-left: 7px;

        & svg {
          width: 12px;
          height: 12px;
        }

        & .icon-edit {
          path {
            transition: 0.2s;
            fill: ${o(`neutral`,`a`)};
          }

          &:hover {
            path {
              fill: ${o(`neutral`,`_1`)};
            }
          }
        }
      }
    }

    .description-wrapper {
      ${r.flex({direction:`row`,justify:`normal`})};

      .description {
        display: block;
        max-width: 244px;
        color: ${o(`neutral`,`a`)};
        font-weight: 400;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
    }
  }

  .selected-wrapper {
    display: flex;
    flex-shrink: 0;
    width: 24px;
    padding: 4px;
    justify-content: center;
    align-items: center;

    .icon-check {
      width: 16px;
      height: 16px;
    }
  }
`})),g,_,v,y=e((()=>{u(),p(),g=t(s()),h(),_=l(),v=({selected:e,networkMetainfo:t,moveEditPage:n,changeNetwork:r})=>{let i=(0,g.useCallback)(e=>{e.preventDefault(),e.stopPropagation(),n(t.id)},[n,t.id]);return(0,_.jsxs)(m,{onClick:(0,g.useCallback)(()=>{r(t.id)},[r,t.id]),children:[(0,_.jsxs)(`div`,{className:`info-wrapper`,children:[(0,_.jsxs)(`div`,{className:`name-wrapper`,children:[(0,_.jsx)(`span`,{className:`name`,children:t.networkName}),(0,_.jsx)(`div`,{className:`icon-wrapper`,onClick:i,children:(0,_.jsx)(f,{className:`icon-edit`})})]}),(0,_.jsx)(`div`,{className:`description-wrapper`,children:(0,_.jsx)(`span`,{className:`description`,children:t.rpcUrl})})]}),e&&(0,_.jsx)(`div`,{className:`selected-wrapper`,children:(0,_.jsx)(`img`,{className:`icon-check`,src:`data:image/svg+xml,%3csvg%20width='16'%20height='16'%20viewBox='0%200%2016%2016'%20fill='none'%20xmlns='http://www.w3.org/2000/svg'%3e%3cpath%20d='M8%2016C12.4183%2016%2016%2012.4183%2016%208C16%203.58172%2012.4183%200%208%200C3.58172%200%200%203.58172%200%208C0%2012.4183%203.58172%2016%208%2016Z'%20fill='%230059FF'/%3e%3cpath%20d='M5%208.5L7%2011.5L11%205.5'%20stroke='white'%20strokeWidth='1.5'%20strokeLinecap='round'%20strokeLinejoin='round'/%3e%3c/svg%3e`,alt:`check`})})]})},v.__docgenInfo={description:``,methods:[],displayName:`NetworkListItem`,props:{selected:{required:!0,tsType:{name:`boolean`},description:``},locked:{required:!0,tsType:{name:`boolean`},description:``},networkMetainfo:{required:!0,tsType:{name:`NetworkMetainfo`},description:``},moveEditPage:{required:!0,tsType:{name:`signature`,type:`function`,raw:`(networkMetainfoId: string) => void`,signature:{arguments:[{type:{name:`string`},name:`networkMetainfoId`}],return:{name:`void`}}},description:``},changeNetwork:{required:!0,tsType:{name:`signature`,type:`function`,raw:`(networkMetainfoId: string) => void`,signature:{arguments:[{type:{name:`string`},name:`networkMetainfoId`}],return:{name:`void`}}},description:``}}}}));export{y as n,v as t};