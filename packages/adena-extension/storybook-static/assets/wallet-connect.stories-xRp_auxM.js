import{n as e,o as t}from"./chunk-zsgVPwQN.js";import{_ as n,c as r,g as i,i as a,n as o,r as s,rt as c,s as l,t as u}from"./iframe-BclzClxJ.js";import{h as d,t as f}from"./atoms-kch4SvDy.js";import{m as p,r as m}from"./approve-ledger-loading-BtJ73zaA.js";import{t as h}from"./approve-loading-BwXQvQoR.js";import{n as g,t as _}from"./check-circle-BwGLFhss.js";var v=e((()=>{})),y,b=e((()=>{g(),l(),a(),n(),y=i.div`
  ${r.flex({justify:`flex-start`})};
  width: 100%;
  padding: 0 20px;
  align-self: center;

  .main-title {
    max-width: 320px;
    text-overflow: ellipsis;
    margin-top: 24px;
    overflow: hidden;
    white-space: nowrap;
    width: 100%;
    text-align: center;
  }

  .logo-wrapper {
    margin: 24px auto;
    width: 100%;
    height: auto;
    text-align: center;

    img {
      width: 80px;
      height: 80px;
    }
  }

  .domain-wrapper {
    ${r.flex({direction:`row`})};
    width: 100%;
    min-height: 41px;
    border-radius: 24px;
    padding: 10px 18px;
    margin-bottom: 12px;
    background-color: ${s(`neutral`,`_9`)};
    ${o.body2Reg};
  }

  .info-table {
    width: 100%;
    height: auto;
    border-radius: 18px;
    background-color: ${s(`neutral`,`_9`)};

    .info-table-header {
      ${r.flex({align:`flex-start`})};
      width: 100%;
      padding: 12px;
      color: ${s(`neutral`,`a`)};
      ${o.body2Bold};
      border-bottom: 2px solid ${s(`neutral`,`_8`)};
    }

    .info-table-body {
      ${r.flex({align:`flex-start`})};
      width: 100%;
      padding: 12px;
      gap: 8px;
      ${o.body2Reg};

      .row {
        position: relative;
        padding-left: 24px;
        :before {
          content: '';
          width: 16px;
          height: 16px;
          background-image: url(${_});
          ${r.posTopCenterLeft()}
        }
      }
    }
  }

  .description-wrapper {
    ${r.flex({align:`flex-start`})};
    padding: 4px 0;
    margin-bottom: 43px;
    color: ${s(`neutral`,`a`)};
    ${o.captionReg};
  }
`})),x,S,C,w=e((()=>{v(),f(),m(),x=t(c()),b(),S=u(),C=({loading:e,app:t,logo:n,domain:r,processing:i,done:a,onClickConnect:o,onClickCancel:s,onResponse:c})=>e?(0,S.jsx)(h,{rightButtonText:`Connect`}):((0,x.useEffect)(()=>{a&&c()},[a,c]),(0,S.jsxs)(y,{children:[(0,S.jsx)(d,{className:`main-title`,type:`header4`,children:`Connect to ${t}`}),(0,S.jsx)(`div`,{className:`logo-wrapper`,children:(0,S.jsx)(`img`,{src:n||`data:image/svg+xml,%3csvg%20width='80'%20height='80'%20viewBox='0%200%2080%2080'%20fill='none'%20xmlns='http://www.w3.org/2000/svg'%3e%3crect%20width='80'%20height='80'%20rx='12'%20fill='%23191920'/%3e%3cg%20clipPath='url(%23clip0_4258_79017)'%3e%3cpath%20d='M65%2019H15C14.4477%2019%2014%2019.4477%2014%2020V59C14%2059.5523%2014.4477%2060%2015%2060H65C65.5523%2060%2066%2059.5523%2066%2059V20C66%2019.4477%2065.5523%2019%2065%2019Z'%20fill='%23E7E8F3'/%3e%3cpath%20d='M60.1022%2053.4891C60.4983%2054.1557%2060.0179%2055%2059.2425%2055H20.6114C19.8696%2055%2019.386%2054.2208%2019.7153%2053.5561L31.1912%2030.3903C31.5139%2029.739%2032.4018%2029.6386%2032.8617%2030.2015L45.7084%2045.9248C46.0941%2046.3969%2046.809%2046.4169%2047.2206%2045.9671L51.4107%2041.3871C51.8635%2040.8922%2052.6655%2040.9747%2053.0082%2041.5513L60.1022%2053.4891Z'%20fill='%23191920'/%3e%3cpath%20d='M47%2037C49.2091%2037%2051%2035.2091%2051%2033C51%2030.7909%2049.2091%2029%2047%2029C44.7909%2029%2043%2030.7909%2043%2033C43%2035.2091%2044.7909%2037%2047%2037Z'%20fill='%23191920'/%3e%3c/g%3e%3cdefs%3e%3cclipPath%20id='clip0_4258_79017'%3e%3crect%20width='52'%20height='41'%20fill='white'%20transform='translate(14%2019)'/%3e%3c/clipPath%3e%3c/defs%3e%3c/svg%3e`,alt:`logo img`})}),(0,S.jsx)(`div`,{className:`domain-wrapper`,children:(0,S.jsx)(`span`,{children:r})}),(0,S.jsxs)(`div`,{className:`info-table`,children:[(0,S.jsx)(`div`,{className:`info-table-header`,children:(0,S.jsx)(`span`,{children:`Allow this site to:`})}),(0,S.jsxs)(`div`,{className:`info-table-body`,children:[(0,S.jsx)(`div`,{className:`row`,children:(0,S.jsx)(`span`,{children:`See your address, balance and activity `})}),(0,S.jsx)(`div`,{className:`row`,children:(0,S.jsx)(`span`,{children:`Suggest transactions to approve`})})]})]}),(0,S.jsx)(`div`,{className:`description-wrapper`,children:(0,S.jsx)(`span`,{children:`Only connect to websites you trust.`})}),(0,S.jsx)(p,{filled:!0,leftButton:{text:`Cancel`,onClick:s},rightButton:{primary:!0,loading:i,text:`Connect`,onClick:o}})]})),C.__docgenInfo={description:``,methods:[],displayName:`WalletConnect`,props:{loading:{required:!0,tsType:{name:`boolean`},description:``},app:{required:!0,tsType:{name:`string`},description:``},logo:{required:!0,tsType:{name:`string`},description:``},domain:{required:!0,tsType:{name:`string`},description:``},processing:{required:!0,tsType:{name:`boolean`},description:``},done:{required:!0,tsType:{name:`boolean`},description:``},onClickConnect:{required:!0,tsType:{name:`signature`,type:`function`,raw:`() => void`,signature:{arguments:[],return:{name:`void`}}},description:``},onClickCancel:{required:!0,tsType:{name:`signature`,type:`function`,raw:`() => void`,signature:{arguments:[],return:{name:`void`}}},description:``},onResponse:{required:!0,tsType:{name:`signature`,type:`function`,raw:`() => void`,signature:{arguments:[],return:{name:`void`}}},description:``},onTimeout:{required:!0,tsType:{name:`signature`,type:`function`,raw:`() => void`,signature:{arguments:[],return:{name:`void`}}},description:``}}}})),T,E,D,O;e((()=>{w(),{action:T}=__STORYBOOK_MODULE_ACTIONS__,E={title:`components/approve/WalletConnect`,component:C},D={args:{domain:``,loading:!0,logo:``,app:``,processing:!0,done:!1,onClickConnect:T(`cancel`),onClickCancel:T(`connect`),onResponse:T(`response`),onTimeout:T(`timeout`)}},D.parameters={...D.parameters,docs:{...D.parameters?.docs,source:{originalSource:`{
  args: {
    domain: '',
    loading: true,
    logo: '',
    app: '',
    processing: true,
    done: false,
    onClickConnect: action('cancel'),
    onClickCancel: action('connect'),
    onResponse: action('response'),
    onTimeout: action('timeout')
  }
}`,...D.parameters?.docs?.source}}},O=[`Default`]}))();export{D as Default,O as __namedExportsOrder,E as default};