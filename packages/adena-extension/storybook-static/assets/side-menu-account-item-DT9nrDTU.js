import{c as e,i as t}from"./_polyfill-node.global-CL4hvcq6.js";import{_ as n,b as r,c as i,g as a,i as o,n as s,r as c,rt as l,s as u,t as d}from"./iframe-DekVl-_p.js";import{t as f}from"./copy-icon-button-CRvkmue8.js";import{c as p,t as m}from"./atoms-DPNcwsZr.js";import{r as h}from"./approve-ledger-loading-BquluU52.js";import{n as g,t as _}from"./icon-link-ThPBLl5Y.js";import{g as v,v as y}from"./states-BE7Qz_yL.js";import{t as b}from"./token-balance-DOMhhn0q.js";import{n as x,t as S}from"./icon-qrcode-C5pdtO4S.js";var C,w,T=t((()=>{l(),C=d(),w=()=>(0,C.jsxs)(`svg`,{width:`16`,height:`16`,viewBox:`0 0 16 16`,fill:`none`,xmlns:`http://www.w3.org/2000/svg`,children:[(0,C.jsx)(`ellipse`,{cx:`1.25`,cy:`1.25`,rx:`1.25`,ry:`1.25`,transform:`matrix(-4.37114e-08 1 1 4.37114e-08 6.75 1.6499)`,fill:`#C3D2EA`}),(0,C.jsx)(`ellipse`,{cx:`1.25`,cy:`1.25`,rx:`1.25`,ry:`1.25`,transform:`matrix(-4.37114e-08 1 1 4.37114e-08 6.75 6.75)`,fill:`#C3D2EA`}),(0,C.jsx)(`ellipse`,{cx:`1.25`,cy:`1.25`,rx:`1.25`,ry:`1.25`,transform:`matrix(-4.37114e-08 1 1 4.37114e-08 6.75 11.8499)`,fill:`#C3D2EA`})]}),w.__docgenInfo={description:``,methods:[],displayName:`IconEtc`}})),E,D,O=t((()=>{u(),o(),n(),E=a.div`
  ${i.flex({direction:`row`,justify:`space-between`})};
  width: 100%;
  height: auto;
  padding: 12px 20px;
  transition: 0.2s;
  cursor: pointer;

  &.selected {
    background-color: ${c(`neutral`,`_7`)};
  }

  &:hover {
    background-color: ${c(`neutral`,`_7`)};
  }

  .info-wrapper {
    ${i.flex({align:`flex-start`,justify:`normal`})};

    .address-wrapper {
      display: inline-flex;
      flex-direction: row;

      .name {
        ${s.body2Bold}
        line-height: 18px;
      }

      .copy-button {
        margin: 0 8px 0 5px;
      }

      .label {
        display: flex;
        height: 16px;
        padding: 3px 10px;
        border-radius: 3px;
        background: #191920;
        justify-content: center;
        align-items: center;
        ${s.captionReg}
      }
    }

    .balance-wrapper {
      display: flex;
      width: 100%;
      height: auto;
      .balance {
        color: ${c(`neutral`,`a`)};
        ${s.body3Reg}
        line-height: 18px;
      }
    }
  }

  .more-wrapper {
    position: relative;
    display: flex;
    width: 16px;
    height: 16px;
    cursor: pointer;

    & > svg {
      width: 100%;
      height: 100%;
    }
    & > svg ellipse {
      transition: 0.2s;
      fill: ${c(`neutral`,`_3`)};
    }

    &:hover {
      & > svg ellipse {
        fill: ${c(`neutral`,`_1`)};
      }
    }
  }
`,D=a.div`
  position: absolute;
  left: ${({positionX:e})=>`${e-130}px`};
  top: ${({positionY:e})=>`${e-40}px`};
  width: 146px;
  background-color: ${c(`neutral`,`_8`)};
  border: 1px solid ${c(`neutral`,`_7`)};
  border-radius: 12.5px;
  box-shadow: 0px 2px 4px 0px rgba(0, 0, 0, 0.2);
  z-index: 99;
  overflow: hidden;

  .info-wrapper {
    ${i.flex({direction:`row`,align:`normal`,justify:`normal`})};
    padding: 7px 0 7px 12px;
    border-bottom: 1px solid ${c(`neutral`,`_7`)};
    cursor: pointer;

    &:hover {
      transition: 0.2s;
      background-color: ${c(`neutral`,`_7`)};
    }

    &:last-child {
      border-bottom: 0;
    }

    svg {
      width: 14px;
      height: 14px;
    }

    .title {
      width: 100%;
      margin-left: 8px;
      ${s.body3Reg}
      line-height: 12px;
    }
  }
`})),k,A,j,M,N=t((()=>{T(),g(),x(),y(),m(),h(),k=e(l()),n(),O(),A=d(),j=({selected:e,account:t,focusedAccountId:n,changeAccount:i,focusAccountId:a,moveGnoscan:o,moveAccountDetail:s})=>{let c=r(),{accountId:l,name:u,address:d,balance:p,type:m}=t,[h,g]=(0,k.useState)(!1),[_,y]=(0,k.useState)(0),[x,S]=(0,k.useState)(0),C=(0,k.useMemo)(()=>u,[u]),T=(0,k.useMemo)(()=>{switch(m){case`AIRGAP`:return`Airgap`;case`WEB3_AUTH`:return`Google`;case`PRIVATE_KEY`:return`Imported`;case`LEDGER`:return`Ledger`;case`MULTISIG`:return`Multsig`;default:return null}},[m]),D=(0,k.useCallback)(e=>{e.preventDefault(),e.stopPropagation(),i(l),a(null)},[i,t]),O=(0,k.useCallback)(e=>{e.preventDefault(),e.stopPropagation();let{x:t,y:n}=e.currentTarget.getBoundingClientRect();y(t),S(n),a(l)},[h]);return(0,k.useEffect)(()=>{l&&g(l===n)},[l,n]),(0,k.useEffect)(()=>{if(l!==n)return;let e=()=>{a(null)};return window.addEventListener(`click`,e),()=>window.removeEventListener(`click`,e)},[l,n,a]),(0,A.jsxs)(E,{className:e?`selected`:``,onClick:D,children:[(0,A.jsxs)(`div`,{className:`info-wrapper`,children:[(0,A.jsxs)(`div`,{className:`address-wrapper`,children:[(0,A.jsx)(`span`,{className:`name`,children:C}),(0,A.jsx)(f,{className:`copy-button`,copyText:d,onClick:()=>a(null)}),T!==null&&(0,A.jsx)(`span`,{className:`label`,children:T})]}),(0,A.jsx)(`div`,{className:`balance-wrapper`,children:p===`-`?(0,A.jsx)(`span`,{className:`balance`,children:p}):(0,A.jsx)(b,{value:p,denom:v.symbol,fontColor:c.neutral.a,orientation:`HORIZONTAL`,minimumFontSize:`11px`,fontStyleKey:`body3Reg`})})]}),(0,A.jsxs)(`div`,{className:`more-wrapper`,onClick:O,children:[(0,A.jsx)(w,{}),h&&(0,A.jsx)(M,{accountId:l,address:d,close:()=>g(!1),moveGnoscan:o,moveAccountDetail:s,positionX:_,positionY:x})]})]})},M=({accountId:e,address:t,positionX:n,positionY:r,moveGnoscan:i,moveAccountDetail:a})=>{function o(e){e.preventDefault(),e.stopPropagation()}let s=(0,k.useCallback)(t=>{t.preventDefault(),t.stopPropagation(),a(e)},[a,e]);return(0,A.jsx)(p,{selector:`portal-popup`,children:(0,A.jsxs)(D,{positionX:n,positionY:r,onMouseOver:o,children:[(0,A.jsxs)(`div`,{className:`info-wrapper`,onClick:(0,k.useCallback)(e=>{e.preventDefault(),e.stopPropagation(),i(t)},[i,t]),children:[(0,A.jsx)(_,{}),(0,A.jsx)(`span`,{className:`title`,children:`View on GnoScan`})]}),(0,A.jsxs)(`div`,{className:`info-wrapper`,onClick:s,children:[(0,A.jsx)(S,{}),(0,A.jsx)(`span`,{className:`title`,children:`Account Details`})]})]})})},j.__docgenInfo={description:``,methods:[],displayName:`SideMenuAccountItem`}}));export{N as n,j as t};