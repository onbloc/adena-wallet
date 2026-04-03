import{j as e,m as h}from"./global-style-Be4sOX77.js";import{I as R}from"./icon-link-BfCCJL0P.js";import{I as T}from"./icon-qrcode-BddMFtIB.js";import{G as D}from"./token.constant-C-ogqcde.js";import{P as A}from"./index-Ct-w3XHB.js";import"./index-CLRA8FOO.js";import{C as G}from"./index-DrT1707K.js";import"./index-DjFTnIrN.js";import"./index-DacC881Y.js";import"./index-BxhAeZbh.js";import"./index-CulhM7-u.js";import"./index-CpLq81TF.js";import"./index-Bv2zqv-E.js";import"./index-g6zNktBg.js";import"./index-B3tmVslE.js";import"./index-C6Pb5J-W.js";import"./index-C0j4FPrl.js";import"./index-jlviZXHb.js";import"./index-Dfwxv35r.js";import"./index-gWriterE.js";import"./index-BPXqDXY6.js";import{T as L}from"./index-VyJW6yi1.js";import"./index-BKC22mc2.js";import"./index-FLo-pS1C.js";import"./index-BcayXZGa.js";import{f as m,g as i,d as v,n as O,r}from"./theme-D2qI5cuM.js";const k=()=>e.jsxs("svg",{width:"16",height:"16",viewBox:"0 0 16 16",fill:"none",xmlns:"http://www.w3.org/2000/svg",children:[e.jsx("ellipse",{cx:"1.25",cy:"1.25",rx:"1.25",ry:"1.25",transform:"matrix(-4.37114e-08 1 1 4.37114e-08 6.75 1.6499)",fill:"#C3D2EA"}),e.jsx("ellipse",{cx:"1.25",cy:"1.25",rx:"1.25",ry:"1.25",transform:"matrix(-4.37114e-08 1 1 4.37114e-08 6.75 6.75)",fill:"#C3D2EA"}),e.jsx("ellipse",{cx:"1.25",cy:"1.25",rx:"1.25",ry:"1.25",transform:"matrix(-4.37114e-08 1 1 4.37114e-08 6.75 11.8499)",fill:"#C3D2EA"})]});k.__docgenInfo={description:"",methods:[],displayName:"IconEtc"};const B=v.div`
  ${h.flex({direction:"row",justify:"space-between"})};
  width: 100%;
  height: auto;
  padding: 12px 20px;
  transition: 0.2s;
  cursor: pointer;

  &.selected {
    background-color: ${i("neutral","_7")};
  }

  &:hover {
    background-color: ${i("neutral","_7")};
  }

  .info-wrapper {
    ${h.flex({align:"flex-start",justify:"normal"})};

    .address-wrapper {
      display: inline-flex;
      flex-direction: row;

      .name {
        ${m.body2Bold}
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
        ${m.captionReg}
      }
    }

    .balance-wrapper {
      display: flex;
      width: 100%;
      height: auto;
      .balance {
        color: ${i("neutral","a")};
        ${m.body3Reg}
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
      fill: ${i("neutral","_3")};
    }

    &:hover {
      & > svg ellipse {
        fill: ${i("neutral","_1")};
      }
    }
  }
`,H=v.div`
  position: absolute;
  left: ${({positionX:s})=>`${s-130}px`};
  top: ${({positionY:s})=>`${s-40}px`};
  width: 146px;
  background-color: ${i("neutral","_8")};
  border: 1px solid ${i("neutral","_7")};
  border-radius: 12.5px;
  box-shadow: 0px 2px 4px 0px rgba(0, 0, 0, 0.2);
  z-index: 99;
  overflow: hidden;

  .info-wrapper {
    ${h.flex({direction:"row",align:"normal",justify:"normal"})};
    padding: 7px 0 7px 12px;
    border-bottom: 1px solid ${i("neutral","_7")};
    cursor: pointer;

    &:hover {
      transition: 0.2s;
      background-color: ${i("neutral","_7")};
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
      ${m.body3Reg}
      line-height: 12px;
    }
  }
`,K=({selected:s,account:p,focusedAccountId:l,changeAccount:c,focusAccountId:a,moveGnoscan:d,moveAccountDetail:x})=>{const u=O(),{accountId:t,name:o,address:g,balance:f,type:w}=p,[b,j]=r.useState(!1),[C,$]=r.useState(0),[N,I]=r.useState(0),E=r.useMemo(()=>o,[o]),y=r.useMemo(()=>{switch(w){case"AIRGAP":return"Airgap";case"WEB3_AUTH":return"Google";case"PRIVATE_KEY":return"Imported";case"LEDGER":return"Ledger";case"MULTISIG":return"Multsig";default:return null}},[w]),M=r.useCallback(n=>{n.preventDefault(),n.stopPropagation(),c(t),a(null)},[c,p]),_=r.useCallback(n=>{n.preventDefault(),n.stopPropagation();const{x:S,y:P}=n.currentTarget.getBoundingClientRect();$(S),I(P),a(t)},[b]);return r.useEffect(()=>{if(!t)return;j(t===l)},[t,l]),r.useEffect(()=>{if(t!==l)return;const n=()=>{a(null)};return window.addEventListener("click",n),()=>window.removeEventListener("click",n)},[t,l,a]),e.jsxs(B,{className:s?"selected":"",onClick:M,children:[e.jsxs("div",{className:"info-wrapper",children:[e.jsxs("div",{className:"address-wrapper",children:[e.jsx("span",{className:"name",children:E}),e.jsx(G,{className:"copy-button",copyText:g,onClick:()=>a(null)}),y!==null&&e.jsx("span",{className:"label",children:y})]}),e.jsx("div",{className:"balance-wrapper",children:f==="-"?e.jsx("span",{className:"balance",children:f}):e.jsx(L,{value:f,denom:D.symbol,fontColor:u.neutral.a,orientation:"HORIZONTAL",minimumFontSize:"11px",fontStyleKey:"body3Reg"})})]}),e.jsxs("div",{className:"more-wrapper",onClick:_,children:[e.jsx(k,{}),b&&e.jsx(V,{accountId:t,address:g,close:()=>j(!1),moveGnoscan:d,moveAccountDetail:x,positionX:C,positionY:N})]})]})},V=({accountId:s,address:p,positionX:l,positionY:c,moveGnoscan:a,moveAccountDetail:d})=>{function x(o){o.preventDefault(),o.stopPropagation()}const u=r.useCallback(o=>{o.preventDefault(),o.stopPropagation(),d(s)},[d,s]),t=r.useCallback(o=>{o.preventDefault(),o.stopPropagation(),a(p)},[a,p]);return e.jsx(A,{selector:"portal-popup",children:e.jsxs(H,{positionX:l,positionY:c,onMouseOver:x,children:[e.jsxs("div",{className:"info-wrapper",onClick:t,children:[e.jsx(R,{}),e.jsx("span",{className:"title",children:"View on GnoScan"})]}),e.jsxs("div",{className:"info-wrapper",onClick:u,children:[e.jsx(T,{}),e.jsx("span",{className:"title",children:"Account Details"})]})]})})};K.__docgenInfo={description:"",methods:[],displayName:"SideMenuAccountItem"};export{K as S};
