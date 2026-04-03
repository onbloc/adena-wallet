import{j as e,m as d,R as he}from"./global-style-Be4sOX77.js";import{I as st,a as P,T as b,B as _,c as ot,R as G,C as lt}from"./index-Ct-w3XHB.js";import{V as D}from"./index-CLRA8FOO.js";import"./index-DrT1707K.js";import"./index-DjFTnIrN.js";import"./index-DacC881Y.js";import"./index-BxhAeZbh.js";import{S as dt,a as pt}from"./index-CulhM7-u.js";import"./index-CpLq81TF.js";import"./index-Bv2zqv-E.js";import"./index-g6zNktBg.js";import"./index-B3tmVslE.js";import"./index-C6Pb5J-W.js";import"./index-C0j4FPrl.js";import"./index-jlviZXHb.js";import{f as ct,S as ut,F as mt}from"./client-utils-zr3RfGzN.js";import{f as h,g as a,d as m,r as s,R as S,t as fe,l as K,m as gt,n as Ne}from"./theme-D2qI5cuM.js";import"./index-gWriterE.js";import{U as le}from"./common-unknown-logo-D3UstGT7.js";import{I as O}from"./info-tooltip-DLlSKEy5.js";import{c as xt,f as ht}from"./wallet-BURXSrHk.js";import"./index-BPXqDXY6.js";import{T as Z}from"./index-VyJW6yi1.js";import"./index-BKC22mc2.js";import"./index-FLo-pS1C.js";import"./index-BcayXZGa.js";import{N as ft}from"./network-fee-custom-input-pot4XkOO.js";import{a as ye,G as z}from"./token.constant-C-ogqcde.js";import{B as E}from"./bignumber-B1z4pYDt.js";import{A as _e}from"./index-B5E4NBgv.js";import{A as yt,a as wt}from"./common-arrow-up-gray-kFpYaQkk.js";import{I as vt}from"./icon-link-BfCCJL0P.js";import{r as V,i as bt}from"./string-utils-Bff5ZSZ1.js";const jt="data:image/svg+xml,%3csvg%20width='34'%20height='34'%20viewBox='0%200%2034%2034'%20fill='none'%20xmlns='http://www.w3.org/2000/svg'%3e%3ccircle%20cx='17'%20cy='17'%20r='17'%20fill='%2339394E'/%3e%3crect%20x='25.5'%20y='18'%20width='17'%20height='2'%20transform='rotate(-180%2025.5%2018)'%20fill='white'/%3e%3crect%20x='16'%20y='25.5'%20width='17'%20height='2'%20transform='rotate(-90%2016%2025.5)'%20fill='white'/%3e%3c/svg%3e",we="data:image/svg+xml,%3csvg%20width='34'%20height='34'%20viewBox='0%200%2034%2034'%20fill='none'%20xmlns='http://www.w3.org/2000/svg'%3e%3ccircle%20cx='17'%20cy='17'%20r='17'%20fill='%2378A7FF'/%3e%3cpath%20d='M26.7971%2013.5762C26.9924%2013.3809%2026.9924%2013.0644%2026.7971%2012.8691L23.6152%209.68712C23.4199%209.49186%2023.1033%209.49186%2022.908%209.68712C22.7128%209.88238%2022.7128%2010.199%2022.908%2010.3942L25.7365%2013.2227L22.908%2016.0511C22.7128%2016.2463%2022.7128%2016.5629%2022.908%2016.7582C23.1033%2016.9535%2023.4199%2016.9535%2023.6152%2016.7582L26.7971%2013.5762ZM7.55469%2013.7227H26.4436V12.7227H7.55469V13.7227Z'%20fill='white'/%3e%3cpath%20d='M7.20287%2020.4238C7.00761%2020.6191%207.00761%2020.9356%207.20287%2021.1309L10.3848%2024.3129C10.5801%2024.5081%2010.8967%2024.5081%2011.092%2024.3129C11.2872%2024.1176%2011.2872%2023.801%2011.092%2023.6058L8.26353%2020.7773L11.092%2017.9489C11.2872%2017.7537%2011.2872%2017.4371%2011.092%2017.2418C10.8967%2017.0465%2010.5801%2017.0465%2010.3848%2017.2418L7.20287%2020.4238ZM26.4453%2020.2773L7.55642%2020.2773L7.55642%2021.2773L26.4453%2021.2773L26.4453%2020.2773Z'%20fill='white'/%3e%3c/svg%3e";var I=(t=>(t.FAST="FAST",t.AVERAGE="AVERAGE",t.SLOW="SLOW",t))(I||{});const kt=m.div`
  ${d.flex({direction:"column",justify:"flex-start"})};
  width: 100%;
  background-color: ${a("neutral","_9")};
  border-radius: 18px;

  .row {
    ${d.flex({direction:"row",justify:"space-between"})};
    width: 100%;
    padding: 10px 18px;
    border-bottom: 1px solid ${a("neutral","_8")};

    &:last-child {
      border-bottom: none;
    }

    .column {
      ${h.body2Reg};
      color: ${a("neutral","_1")};

      &.key {
        color: ${a("neutral","a")};
      }
    }
  }
`,Ae=({data:t})=>e.jsx(kt,{children:t.map((r,n)=>e.jsxs("div",{className:"row",children:[e.jsx("span",{className:"column key",children:r.key}),e.jsx("span",{className:"column",children:r.value})]},n))});Ae.__docgenInfo={description:"",methods:[],displayName:"Datatable",props:{data:{required:!0,tsType:{name:"Array",elements:[{name:"signature",type:"object",raw:`{
  key: string
  value: string
}`,signature:{properties:[{key:"key",value:{name:"string",required:!0}},{key:"value",value:{name:"string",required:!0}}]}}],raw:`{
  key: string
  value: string
}[]`},description:""}}};const Tt=m.div`
  ${d.flex({justify:"flex-start"})};
  width: 100%;
  height: auto;
  padding: 50px 20px 120px;
  align-self: center;

  .icon {
    display: flex;
    flex-shrink:
    margin: 0 auto 20px auto;
  }

  div {
    text-align: center;
  }

  .data-wrapper {
    ${d.flex({justify:"flex-start"})};
    width: 100%;
    margin-top: 20px;
  }
`,Ct=({document:t,onClickCancel:r})=>{const n=s.useMemo(()=>{if(!t)return null;const i=t.fee.amount[0]?`${t.fee.amount[0]?.amount}${t.fee.amount[0]?.denom}`:"";return[{key:"Chain ID",value:t.chain_id},{key:"Account",value:t.account_number},{key:"Sequence",value:t.sequence},{key:"Gas Fee",value:i},{key:"Gas Wanted",value:t.fee.gas}]},[t]);return e.jsxs(Tt,{children:[e.jsx(st,{name:"iconConnectLoading",className:"icon"}),e.jsx(me,{title:`Requesting Approval
on Hardware Wallet`,desc:`Please approve this transaction on your
ledger device to proceed.`}),n&&e.jsx("div",{className:"data-wrapper",children:e.jsx(Ae,{data:n})}),e.jsx(te,{text:"Cancel",onClick:r})]})};Ct.__docgenInfo={description:"",methods:[],displayName:"ApproveLedgerLoading",props:{document:{required:!0,tsType:{name:"union",raw:"Document | null",elements:[{name:"Document"},{name:"null"}]},description:""},onClickCancel:{required:!0,tsType:{name:"signature",type:"function",raw:"() => void",signature:{arguments:[],return:{name:"void"}}},description:""}}};const qe="data:image/svg+xml,%3csvg%20width='16'%20height='16'%20viewBox='0%200%2016%2016'%20fill='none'%20xmlns='http://www.w3.org/2000/svg'%3e%3cpath%20d='M4%206L8%2010L12%206'%20stroke='%23777777'%20strokeWidth='1.5'%20strokeLinecap='round'%20strokeLinejoin='round'/%3e%3c/svg%3e",Le="data:image/svg+xml,%3csvg%20width='16'%20height='16'%20viewBox='0%200%2016%2016'%20fill='none'%20xmlns='http://www.w3.org/2000/svg'%3e%3cpath%20d='M12%2010L8%206L4%2010'%20stroke='%23777777'%20strokeWidth='1.5'%20strokeLinecap='round'%20strokeLinejoin='round'/%3e%3c/svg%3e",Ie=({className:t})=>e.jsxs("svg",{className:t,width:"16",height:"16",viewBox:"0 0 16 16",fill:"none",xmlns:"http://www.w3.org/2000/svg",children:[e.jsx("line",{x1:"0.75",y1:"-0.75",x2:"12.4353",y2:"-0.75",transform:"matrix(0.703174 0.711018 -0.703174 0.711018 3 3.6875)",stroke:"#A3A3B5",strokeWidth:"1.5",strokeLinecap:"round"}),e.jsx("line",{x1:"0.75",y1:"-0.75",x2:"12.4353",y2:"-0.75",transform:"matrix(-0.703174 0.711018 0.703174 0.711018 13 3.6875)",stroke:"#A3A3B5",strokeWidth:"1.5",strokeLinecap:"round"})]});Ie.__docgenInfo={description:"",methods:[],displayName:"IconEditCancel",props:{className:{required:!0,tsType:{name:"string"},description:""}}};const Me=({className:t})=>e.jsxs("svg",{className:t,width:"16",height:"16",viewBox:"0 0 16 16",fill:"none",xmlns:"http://www.w3.org/2000/svg",children:[e.jsx("path",{d:"M8 15C11.866 15 15 11.866 15 8C15 4.13401 11.866 1 8 1C4.13401 1 1 4.13401 1 8C1 11.866 4.13401 15 8 15Z",stroke:"#A3A3B5",strokeLinecap:"round",strokeLinejoin:"round"}),e.jsx("path",{d:"M5.375 8.4375L7.125 11.0625L10.625 5.8125",stroke:"#A3A3B5",strokeWidth:"1.5",strokeLinecap:"round",strokeLinejoin:"round"})]});Me.__docgenInfo={description:"",methods:[],displayName:"IconEditConfirm",props:{className:{required:!0,tsType:{name:"string"},description:""}}};const Re=({className:t})=>e.jsxs("svg",{className:t,width:"16",height:"16",viewBox:"0 0 16 16",fill:"none",xmlns:"http://www.w3.org/2000/svg",children:[e.jsx("path",{d:"M11.4609 7.33077L6.59732 12.1927L5.89031 11.4856L5.9633 11.4126H5.00185C4.81832 11.4126 4.66816 11.2624 4.66816 11.0789V10.1173L4.59538 10.1903C4.49673 10.2905 4.42436 10.4114 4.38494 10.5449L3.90568 12.176L5.53576 11.6963C5.65047 11.6566 5.7902 11.5836 5.89031 11.4856L6.59732 12.1927C6.38042 12.4096 6.11138 12.5702 5.81731 12.6557L3.30774 13.3941C3.13214 13.4462 2.94214 13.3982 2.81263 13.2501C2.68311 13.1396 2.63468 12.9498 2.68637 12.7725L3.42453 10.2633C3.51129 9.96925 3.67042 9.70019 3.88753 9.48327L8.74963 4.62012L11.4609 7.33077Z",fill:"#646486"}),e.jsx("path",{d:"M13.0547 3.96151C13.576 4.48274 13.576 5.32872 13.0547 5.85016L12.0452 6.85967L9.33398 4.1486L10.3434 3.13909C10.8648 2.6177 11.7115 2.6177 12.2329 3.13909L13.0547 3.96151Z",fill:"#A3A3B5"})]});Re.__docgenInfo={description:"",methods:[],displayName:"IconPencil",props:{className:{required:!0,tsType:{name:"string"},description:""}}};const $t=m(D)`
  width: 100%;
  max-width: ${({$marginRight:t=0})=>`${206-t}px`};
  height: 44px;
  margin-right: ${({$marginRight:t=0})=>`${t}px`};

  .editable-wrapper {
    display: flex;
    flex-direction: row;
    width: 100%;
    height: 100%;
    align-items: center;
    justify-content: space-between;
    gap: 3px;
    border-radius: 30px;
    padding: 10px 18px 10px 10px;
    background-color: ${a("neutral","_7")};
    ${h.body2Reg};

    .edit-input {
      display: flex;
      flex-direction: row;
      width: calc(100% - 40px);
      color: #fff;
      ${h.body2Reg};
      line-height: 16px;
      margin-right: -18px;
    }

    .button-wrapper {
      display: flex;
      flex-direction: row;
      align-items: center;
      justify-content: space-between;
      gap: 4px;
    }
  }

  .display-wrapper {
    display: flex;
    flex-direction: row;
    width: 100%;
    height: 100%;
    align-items: center;
    justify-content: space-between;
    gap: 3px;

    .display-value {
      display: inline;
      width: 100%;
      text-overflow: ellipsis;
      overflow: hidden;
      text-align: end;
      direction: rtl;
      text-align: right;
      unicode-bidi: bidi-override;
      white-space: nowrap;
      ${h.body2Reg};
    }
  }

  .icon-wrapper {
    width: 16px;
    height: 16px;
    cursor: pointer;

    svg {
      &:hover {
        * {
          stroke: ${a("neutral","_1")};
        }
      }
    }
  }
`,F=({value:t,onChange:r,editRightMargin:n=-18,editable:i=!0})=>{const[o,l]=s.useState(!1),[p,g]=s.useState(t),[c,u]=s.useState("none"),w=s.useMemo(()=>t?V(t):"",[t]),y=()=>{l(!0)},j=()=>{l(!1)},C=()=>{o&&(j(),r(p))},x=()=>{j(),g(t)},$=v=>{o&&g(v.target.value)},k=v=>{o&&(v.key==="Enter"?C():v.key==="Escape"&&x())},q=v=>{v.preventDefault(),v.stopPropagation(),u("confirm")},L=v=>{v.preventDefault(),v.stopPropagation(),u("cancel")},M=()=>{u("blur")};s.useEffect(()=>{switch(c){case"none":return;case"cancel":x();break;case"blur":case"confirm":C();break}u("none"),l(!1)},[c]);const A=s.useMemo(()=>o?n:0,[o,n]);return e.jsx($t,{$marginRight:A,children:o?e.jsxs("div",{className:"editable-wrapper",children:[e.jsx("input",{className:"edit-input",value:p,onChange:$,onKeyDown:k,onBlur:M}),e.jsxs("div",{className:"button-wrapper",children:[e.jsx("div",{className:"icon-wrapper",onMouseDown:q,children:e.jsx(Me,{className:"edit-confirm-icon"})}),e.jsx("div",{className:"icon-wrapper",onMouseDown:L,children:e.jsx(Ie,{className:"edit-cancel-icon"})})]})]}):e.jsxs("div",{className:"display-wrapper",children:[e.jsx("span",{className:"display-value",children:w}),i&&e.jsx("div",{className:"icon-wrapper",onClick:y,children:e.jsx(Re,{className:"edit-icon"})})]})})};F.__docgenInfo={description:"",methods:[],displayName:"ArgumentEditBox",props:{editRightMargin:{required:!1,tsType:{name:"number"},description:"",defaultValue:{value:"-18",computed:!1}},value:{required:!0,tsType:{name:"string"},description:""},onChange:{required:!0,tsType:{name:"signature",type:"function",raw:"(value: string) => void",signature:{arguments:[{type:{name:"string"},name:"value"}],return:{name:"void"}}},description:""},editable:{required:!1,tsType:{name:"boolean"},description:"",defaultValue:{value:"true",computed:!1}}}};const B={BANK_MSG_SEND:"/bank.MsgSend",VM_CALL:"/vm.m_call",VM_ADDPKG:"/vm.m_addpkg",VM_RUN:"/vm.m_run"},Se={[B.BANK_MSG_SEND]:"Transfer",[B.VM_ADDPKG]:"AddPackage",[B.VM_RUN]:"Run",[B.VM_CALL]:"Call"},Ee=(t,r,n)=>{const{type:i}=r,[o,l]=S.useState(!0),{max_deposit:p}=r.value,g=S.useMemo(()=>p||"",[p]),c=S.useMemo(()=>Se[i]||"Unknown",[i]),u=S.useMemo(()=>Nt(t,c),[c,t]);return{type:i,isOpen:o,setIsOpen:l,maxDeposit:g,functionName:c,title:u,changeMaxDeposit:y=>{n(t,{...r,value:{...r.value,max_deposit:y}})}}};function Nt(t,r){return`${t+1}. ${r}`}const Y=m(D)`
  width: 100%;
  height: auto;
  border-radius: 18px;
  margin-bottom: ${({hasError:t})=>t?"0":"8px"};
  background-color: ${a("neutral","_9")};
  border: 1px solid ${({hasError:t})=>t?"#EF2D21":"transparent"};

  .message-row {
    ${d.flex({direction:"row"})};
    position: relative;
    width: 100%;
    padding: 10px 0;
    justify-content: space-between;
    border-bottom: 2px solid ${a("neutral","_8")};
    ${h.body2Reg};

    &:last-child {
      border-bottom: none;
    }

    &.argument {
      padding: 0;
    }

    .key {
      display: inline-flex;
      width: fit-content;
      flex-shrink: 0;
      color: ${a("neutral","a")};
      gap: 4px;
    }

    .value {
      display: block;
      max-width: 204px;
      text-align: right;
      text-overflow: ellipsis;
      overflow: hidden;
    }

    .realm-wrapper {
      display: inline-flex;
      flex-direction: row;
      align-items: center;
      justify-content: flex-end;
      gap: 4px;
    }

    & .link-wrapper {
      display: inline-flex;
      width: 14px;
      height: 14px;
      justify-content: center;
      align-items: center;
      cursor: pointer;

      &:hover {
        svg {
          path {
            fill: ${a("neutral","_1")};
          }
        }
      }
    }
  }
`,J=m(D)`
  ${d.flex({direction:"column"})};
  position: relative;
  width: 100%;
  padding: 0 18px;
  justify-content: flex-start;
`,_t=m(D)`
  ${d.flex({direction:"row",align:"center",justify:"space-between"})};
  width: 100%;
  height: auto;
  color: ${a("neutral","a")};
  padding: 14px 18px;
  ${h.body1Bold};
  border-bottom: 2px solid ${a("neutral","_8")};

  & .title-wrapper {
    ${d.flex({direction:"row",align:"center",justify:"space-between"})};
    width: 100%;
    flex-shrink: 0;
    gap: 4px;
    cursor: pointer;
    user-select: none;

    & .title {
      display: inline-flex;
      width: fit-content;
      flex-shrink: 0;
      color: ${a("neutral","_1")};
    }

    & .arrow-icon {
      ${d.flex({direction:"row"})};
      width: 16px;
      height: 16px;
    }
  }
`,X=m.p`
  width: 100%;
  padding: 0px 16px 10px;
  font-family: 'Poppins', sans-serif;
  font-weight: 500;
  font-size: 13px;
  line-height: 18px;
  color: #ef2d21;
`,ve=m.span`
  display: block;
  max-width: 191px;
  text-overflow: ellipsis;
  overflow: hidden;
  direction: rtl;
  text-align: right;
  unicode-bidi: bidi-override;
  ${h.body2Reg};

  & .domain-path {
    color: ${a("neutral","a")};
    font-weight: 400;
  }

  & .namespace-path {
    color: ${a("neutral","_1")};
    font-weight: 400;
  }

  & .contract-path {
    color: ${a("neutral","_1")};
    font-weight: 700;
  }
`,At=`The amount of tokens directly sent to
the realm or account. Double-check the
amount and token symbol before
sending, as it is irreversible once sent.`,de=`The maximum GNOT deposited for
storage usage. You can leave this field
empty as the network will automatically
determine the actual amount required
for storage.`,qt=t=>t===B.VM_CALL,Lt=t=>t===B.VM_ADDPKG,It=t=>t===B.VM_RUN;function Be(t,r){return`${t+1}. ${r}`}const De=({index:t,message:r,argumentKeyMap:n,changeMessage:i,openScannerLink:o,editable:l,errorMessage:p})=>{const{type:g}=r;return qt(g)?e.jsx(Rt,{index:t,message:r,argumentKeyMap:n,changeMessage:i,openScannerLink:o,editable:l,errorMessage:p}):Lt(g)?e.jsx(St,{index:t,message:r,changeMessage:i,openScannerLink:o,editable:l,errorMessage:p}):It(g)?e.jsx(Et,{index:t,message:r,changeMessage:i,openScannerLink:o,editable:l,errorMessage:p}):e.jsx(Mt,{index:t,message:r,changeMessage:i,openScannerLink:o,editable:l,errorMessage:p})},Mt=({index:t,message:r,errorMessage:n})=>{const{type:i}=r,[o,l]=s.useState(!0),p=s.useMemo(()=>Se[i]||"Unknown",[i]),g=s.useMemo(()=>Be(t,p),[p,t]);return e.jsxs(e.Fragment,{children:[e.jsxs(Y,{hasError:!!n,children:[e.jsx(ee,{title:g,isOpen:o,setIsOpen:l}),o&&e.jsxs(J,{children:[e.jsxs("div",{className:"message-row",children:[e.jsx("span",{className:"key",children:"type"}),e.jsx("span",{className:"value",children:i})]}),e.jsxs("div",{className:"message-row",children:[e.jsx("span",{className:"key",children:"function"}),e.jsx("span",{className:"value",children:p})]})]})]}),n&&e.jsx(X,{children:n})]})},Rt=({index:t,message:r,argumentKeyMap:n,changeMessage:i,openScannerLink:o,editable:l,errorMessage:p})=>{const{func:g,pkg_path:c,args:u,send:w,max_deposit:y}=r.value,[j,C]=s.useState(!0),x=s.useMemo(()=>g||"",[g]),$=s.useMemo(()=>Be(t,x),[x,t]),k=s.useMemo(()=>{if(!c)return{path:"",domain:"",nameSpace:"",namespaceSubPath:"",contract:""};const f=c.split("/");if(f.length<3)return{path:c,domain:"",nameSpace:"",namespaceSubPath:"",contract:c};const N=f.slice(1,2).join("/"),T=f[2],H=f.length>4?f.slice(3,f.length-1).join("/"):"",R=f[f.length-1];return{path:c,domain:N,nameSpace:T,namespaceSubPath:H,contract:R}},[c]),q=s.useMemo(()=>u||[],[u]),L=s.useMemo(()=>w||"",[w]),M=s.useMemo(()=>y||"",[y]),A=()=>{o("/realms/details",{path:k.path})},v=f=>{i(t,{...r,value:{...r.value,send:f}})},W=(f,N)=>{if(!u)return;const T=[...u];T[f]=N,i(t,{...r,value:{...r.value,args:T}})},re=f=>{const N={...r.value,max_deposit:f},T={...r,value:N};i(t,T)};return e.jsxs(e.Fragment,{children:[e.jsxs(Y,{hasError:!!p,children:[e.jsx(ee,{title:$,isOpen:j,setIsOpen:C}),j&&e.jsxs(J,{children:[e.jsxs("div",{className:"message-row",children:[e.jsx("span",{className:"key realm",children:"realm"}),e.jsxs("span",{className:"realm-wrapper",children:[e.jsx(Bt,{domain:k.domain,nameSpace:k.nameSpace,namespaceSubPath:k.namespaceSubPath,contract:k.contract}),e.jsx("div",{className:"link-wrapper",onClick:A,children:e.jsx(vt,{})})]})]}),e.jsxs("div",{className:"message-row argument",children:[e.jsxs("span",{className:"key",children:["send",e.jsx(O,{content:At})]}),e.jsx(F,{value:L,onChange:f=>v(f),editable:l})]}),q.map((f,N)=>e.jsxs("div",{className:"message-row argument",children:[e.jsx("span",{className:"key",children:n?.[N]||`arg${N+1}`}),e.jsx(F,{value:f,onChange:T=>W(N,T),editable:l})]},N)),e.jsxs("div",{className:"message-row argument",children:[e.jsxs("span",{className:"key",children:["max_deposit",e.jsx(O,{content:de})]}),e.jsx(F,{value:M,onChange:f=>re(f),editable:l})]})]})]}),p&&e.jsx(X,{children:p})]})},St=({index:t,message:r,changeMessage:n,editable:i,errorMessage:o})=>{const{type:l,isOpen:p,setIsOpen:g,maxDeposit:c,functionName:u,title:w,changeMaxDeposit:y}=Ee(t,r,n);return e.jsxs(e.Fragment,{children:[e.jsxs(Y,{hasError:!!o,children:[e.jsx(ee,{title:w,isOpen:p,setIsOpen:g}),p&&e.jsxs(J,{children:[e.jsxs("div",{className:"message-row",children:[e.jsx("span",{className:"key",children:"type"}),e.jsx("span",{className:"value",children:l})]}),e.jsxs("div",{className:"message-row",children:[e.jsx("span",{className:"key",children:"function"}),e.jsx("span",{className:"value",children:u})]}),e.jsxs("div",{className:"message-row argument",children:[e.jsxs("span",{className:"key",children:["max_deposit",e.jsx(O,{content:de})]}),e.jsx(F,{value:c,onChange:j=>y(j),editable:i})]})]})]}),o&&e.jsx(X,{children:o})]})},Et=({index:t,message:r,changeMessage:n,editable:i,errorMessage:o})=>{const{type:l,isOpen:p,setIsOpen:g,maxDeposit:c,functionName:u,title:w,changeMaxDeposit:y}=Ee(t,r,n);return e.jsxs(e.Fragment,{children:[e.jsxs(Y,{hasError:!!o,children:[e.jsx(ee,{title:w,isOpen:p,setIsOpen:g}),p&&e.jsxs(J,{children:[e.jsxs("div",{className:"message-row",children:[e.jsx("span",{className:"key",children:"type"}),e.jsx("span",{className:"value",children:l})]}),e.jsxs("div",{className:"message-row",children:[e.jsx("span",{className:"key",children:"function"}),e.jsx("span",{className:"value",children:u})]}),e.jsxs("div",{className:"message-row argument",children:[e.jsxs("span",{className:"key",children:["max_deposit",e.jsx(O,{content:de})]}),e.jsx(F,{value:c,onChange:j=>y(j),editable:i})]})]})]}),o&&e.jsx(X,{children:o})]})},ee=({title:t,isOpen:r,setIsOpen:n})=>{const i=()=>{n(!r)};return e.jsx(_t,{onClick:i,children:e.jsxs("div",{className:"title-wrapper",children:[e.jsx("span",{className:"title",children:t}),e.jsx("img",{className:"arrow-icon",src:r?yt:wt,alt:"arrow-icon"})]})})},Bt=({domain:t,nameSpace:r,namespaceSubPath:n,contract:i})=>{const o=s.useMemo(()=>V(t),[t]),l=s.useMemo(()=>{const g=bt(r)?ct(r,4):r;return n.length>0?V(`${g}/${n}`):V(g)},[r,n]),p=s.useMemo(()=>V(i),[i]);return!t&&!l&&!i?e.jsx(ve,{}):e.jsxs(ve,{children:[p&&e.jsx("span",{className:"contract-path",children:p}),p&&e.jsx("span",{className:"contract-path",children:"/"}),l&&e.jsx("span",{className:"namespace-path",children:l}),l&&e.jsx("span",{className:"namespace-path",children:"/"}),o&&e.jsx("span",{className:"domain-path",children:o})]})};De.__docgenInfo={description:"",methods:[],displayName:"ApproveTransactionMessage",props:{index:{required:!0,tsType:{name:"number"},description:""},message:{required:!0,tsType:{name:"ContractMessage"},description:""},argumentKeyMap:{required:!1,tsType:{name:"Record",elements:[{name:"number"},{name:"string"}],raw:"Record<number, string>"},description:""},changeMessage:{required:!0,tsType:{name:"signature",type:"function",raw:"(index: number, messages: ContractMessage) => void",signature:{arguments:[{type:{name:"number"},name:"index"},{type:{name:"ContractMessage"},name:"messages"}],return:{name:"void"}}},description:""},openScannerLink:{required:!0,tsType:{name:"signature",type:"function",raw:"(path: string, parameters?: { [key in string]: string }) => void",signature:{arguments:[{type:{name:"string"},name:"path"},{type:{name:"signature",type:"object",raw:"{ [key in string]: string }",signature:{properties:[{key:{name:"string",required:!0},value:{name:"string"}}]}},name:"parameters"}],return:{name:"void"}}},description:""},editable:{required:!0,tsType:{name:"boolean"},description:""},errorMessage:{required:!1,tsType:{name:"string"},description:""}}};const Dt=m(D)`
  width: 100%;
  height: auto;
`,pe=({messages:t,argumentInfos:r,changeMessages:n,openScannerLink:i,editable:o=!0,messageErrors:l})=>{const p=s.useMemo(()=>{if(r)return r.reduce((c,u)=>(c[u.index]=u.key,c),{})},[r]),g=(c,u)=>{if(!n)return;const w=[...t];w[c]=u,n(w)};return t.length===0?e.jsx(S.Fragment,{}):e.jsx(Dt,{children:t.map((c,u)=>e.jsx(De,{index:u,message:c,argumentKeyMap:p,changeMessage:g,openScannerLink:i,editable:o,errorMessage:l?.[u]},u))})};pe.__docgenInfo={description:"",methods:[],displayName:"ApproveTransactionMessageBox",props:{messages:{required:!0,tsType:{name:"Array",elements:[{name:"ContractMessage"}],raw:"ContractMessage[]"},description:""},argumentInfos:{required:!1,tsType:{name:"Array",elements:[{name:"GnoArgumentInfo"}],raw:"GnoArgumentInfo[]"},description:""},changeMessages:{required:!1,tsType:{name:"signature",type:"function",raw:"(messages: ContractMessage[]) => void",signature:{arguments:[{type:{name:"Array",elements:[{name:"ContractMessage"}],raw:"ContractMessage[]"},name:"messages"}],return:{name:"void"}}},description:""},openScannerLink:{required:!0,tsType:{name:"signature",type:"function",raw:"(path: string, parameters?: { [key in string]: string }) => void",signature:{arguments:[{type:{name:"string"},name:"path"},{type:{name:"signature",type:"object",raw:"{ [key in string]: string }",signature:{properties:[{key:{name:"string",required:!0},value:{name:"string"}}]}},name:"parameters"}],return:{name:"void"}}},description:""},editable:{required:!1,tsType:{name:"boolean"},description:"",defaultValue:{value:"true",computed:!1}},messageErrors:{required:!1,tsType:{name:"Array",elements:[{name:"unknown"}],raw:"(string | undefined)[]"},description:""}}};const Fe=()=>e.jsx("svg",{xmlns:"http://www.w3.org/2000/svg",width:"16",height:"16",viewBox:"0 0 16 16",fill:"none",children:e.jsx("path",{d:"M6 12L10 8L6 4",stroke:"#777777",strokeWidth:"1.5",strokeLinecap:"round",strokeLinejoin:"round"})});Fe.__docgenInfo={description:"",methods:[],displayName:"IconRight"};const Ft=m.div`
  ${d.flex({direction:"column",justify:"flex-start"})};
  width: 100%;

  .error-message {
    position: relative;
    width: 100%;
    padding: 0 16px;
    ${h.captionReg};
    font-size: 13px;
    color: ${a("red","_5")};
    word-break: break-all;
  }
`,Ot=m.div`
  ${d.flex({direction:"row",justify:"space-between"})};
  width: 100%;
  padding: 14px 16px;
  background-color: ${a("neutral","_9")};
  border: 1px solid ${a("neutral","_7")};
  border-radius: 30px;
  ${({error:t,theme:r})=>!!t&&`border-color: ${r.red._5};`}

  & .key {
    ${d.flex({direction:"row"})};
    flex-shrink: 0;
    color: ${a("neutral","a")};
    ${h.body2Reg};
  }

  & .network-fee-amount-wrapper {
    ${d.flex({direction:"row",justify:"flex-end"})};
    width: 100%;
    gap: 3px;

    & .setting-button {
      ${d.flex({direction:"row"})};
      width: 16px;
      height: 16px;
    }
  }
`,Wt=m(P)`
  ${d.flex({align:"flex-start"})};
  width: 55px;
  height: 14px;
  align-self: center;
`,ce=({value:t,denom:r,isLoading:n=!1,isError:i,errorMessage:o,onClickSetting:l})=>{const p=!!l,g=t==="",c=s.useMemo(()=>n?!1:i||!!o,[n,i,o]),u=s.useMemo(()=>!c||g?"":o,[c,g,o]);return e.jsxs(Ft,{children:[e.jsxs(Ot,{error:c&&!g?1:0,children:[e.jsx("span",{className:"key",children:"Network Fee"}),e.jsxs("div",{className:"network-fee-amount-wrapper",children:[e.jsx(Ut,{value:t,denom:r,isLoading:n}),p&&!n&&!g&&e.jsx("button",{className:"setting-button",onClick:l,children:e.jsx(Fe,{})})]})]}),u&&e.jsx("span",{className:"error-message",children:u})]})},Ut=({value:t,denom:r,isLoading:n})=>{const i=!!Number(t)&&!!r;return n?e.jsx(Wt,{}):i?e.jsx(Z,{value:t,denom:r,fontStyleKey:"body2Reg",minimumFontSize:"11px",orientation:"HORIZONTAL"}):e.jsx("span",{className:"value",children:"-"})};ce.__docgenInfo={description:"",methods:[],displayName:"NetworkFee",props:{value:{required:!0,tsType:{name:"string"},description:""},denom:{required:!0,tsType:{name:"string"},description:""},isLoading:{required:!1,tsType:{name:"boolean"},description:"",defaultValue:{value:"false",computed:!1}},isError:{required:!1,tsType:{name:"boolean"},description:""},errorMessage:{required:!1,tsType:{name:"string"},description:""},onClickSetting:{required:!1,tsType:{name:"signature",type:"function",raw:"() => void",signature:{arguments:[],return:{name:"void"}}},description:""}}};m.div`
  ${d.flex({justify:"flex-start"})};
  padding: 24px 20px;
`;const Gt=m.div`
  ${d.flex({justify:"flex-start"})};
  width: 100%;
  padding: 0 20px;
  padding-bottom: 96px;
  align-self: center;

  .row {
    ${d.flex({direction:"row"})};
    position: relative;
    padding: 10px 18px;
    justify-content: space-between;
    border-bottom: 2px solid ${a("neutral","_8")};
    ${h.body1Reg};

    &:last-child {
      border-bottom: none;
    }

    .key {
      display: inline-flex;
      width: fit-content;
      flex-shrink: 0;
      color: ${a("neutral","a")};
    }

    .value {
      display: block;
      max-width: 204px;
      text-align: right;
      text-overflow: ellipsis;
      overflow: hidden;
    }
  }

  .main-title {
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
    ${d.flex({direction:"row",align:"center",justify:"center"})};
    width: 100%;
    min-height: 41px;
    border-radius: 24px;
    padding: 10px 18px;
    margin: 24px auto 12px auto;
    gap: 7px;
    background-color: ${a("neutral","_9")};
    ${h.body2Reg};

    .logo {
      width: 20px;
      height: 20px;
      border-radius: 50%;
    }
  }

  .info-table {
    width: 100%;
    height: auto;
    border-radius: 18px;
    margin-bottom: 8px;
    background-color: ${a("neutral","_9")};
  }

  .memo-wrapper {
    width: 100%;
    min-height: 48px;
    border-radius: 30px;
    padding: 10px 18px;
    margin-bottom: 8px;
    background-color: ${a("neutral","_9")};
    border: 1px solid ${a("neutral","_8")};
    gap: 10px;
    ${h.body2Reg};

    span.value {
      display: block;
      width: 100%;
      max-width: 100%;
      height: auto;
      word-break: break-all;
      overflow: hidden;
      white-space: nowrap;
      text-overflow: ellipsis;
    }

    input.value {
      display: block;
      width: 100%;
      max-width: 100%;
      height: auto;

      &::placeholder {
        color: ${a("neutral","a")};
      }
    }

    &.editable {
      border: 1px solid ${a("neutral","_7")};
    }
  }

  .fee-amount-wrapper {
    ${d.flex({justify:"flex-start"})};
    width: 100%;
    gap: 8px;
    margin-bottom: 8px;
  }

  .error-message {
    position: relative;
    width: 100%;
    padding: 0 16px;
    ${h.captionReg};
    font-size: 13px;
    color: ${a("red","_5")};
    white-space: pre-line;
  }

  .transaction-data-wrapper {
    width: 100%;
    ${h.body2Reg};
    ${d.flex()};

    .visible-button {
      color: ${a("neutral","a")};
      height: fit-content;
      margin-bottom: 5px;

      img {
        margin-left: 3px;
      }
    }
    .textarea-wrapper {
      width: 100%;
      height: 200px;
      border-radius: 24px;
      background-color: ${a("neutral","_9")};
      border: 1px solid ${a("neutral","_7")};
      padding: 12px 16px;
    }
    .raw-info-textarea {
      width: 100%;
      height: 100%;
      overflow: auto;
      ${h.body2Reg};
      resize: none;
    }
    .raw-info-textarea::-webkit-scrollbar {
      width: 2px;
      padding: 1px 1px 1px 0px;
      margin-right: 10px;
    }

    .raw-info-textarea::-webkit-scrollbar-thumb {
      background-color: darkgrey;
    }

    .raw-info-textarea::-webkit-resizer {
      display: none !important;
    }

    margin-bottom: 20px;
  }
`,Vt=({loading:t,title:r,logo:n,domain:i,transactionMessages:o,memo:l,hasMemo:p,networkFee:g,isErrorNetworkFee:c,isNetworkFeeLoading:u,transactionData:w,opened:y,processing:j,done:C,argumentInfos:x,onToggleTransactionData:$,onResponse:k,onClickConfirm:q,onClickCancel:L,openScannerLink:M})=>{const A=s.useMemo(()=>u||c?!0:Number(g?.amount||0)<=0,[c,u,g]),v=s.useMemo(()=>c?"Insufficient network fee":"",[c]),W=s.useCallback(()=>{A||q()},[q,A]);return s.useEffect(()=>{C&&k()},[C,k]),t?e.jsx(_e,{rightButtonText:"Approve"}):e.jsxs(Gt,{$isErrorNetworkFee:c||!1,children:[e.jsx(b,{className:"main-title",type:"header4",children:r}),e.jsxs("div",{className:"domain-wrapper",children:[e.jsx("img",{className:"logo",src:n||le,alt:"logo img"}),e.jsx("span",{children:i})]}),e.jsx(pe,{messages:o,argumentInfos:x,openScannerLink:M,editable:!1}),e.jsxs("div",{className:p?"memo-wrapper row":"memo-wrapper editable row",children:[e.jsx("span",{className:"key",children:"Memo:"}),p?e.jsx("span",{className:"value",children:l}):null]}),e.jsx("div",{className:"fee-amount-wrapper",children:e.jsx(ce,{value:g?.amount||"",denom:g?.denom||"",isError:c,isLoading:u,errorMessage:v})}),e.jsxs("div",{className:"transaction-data-wrapper",children:[e.jsx(_,{hierarchy:"custom",bgColor:"transparent",className:"visible-button",onClick:()=>$(!y),children:y?e.jsxs(e.Fragment,{children:[e.jsx(e.Fragment,{children:"Hide Transaction Data"}),e.jsx("img",{src:Le})]}):e.jsxs(e.Fragment,{children:[e.jsx(e.Fragment,{children:"View Transaction Data"}),e.jsx("img",{src:qe})]})}),y&&e.jsx("div",{className:"textarea-wrapper",children:e.jsx("textarea",{className:"raw-info-textarea",value:w,readOnly:!0,draggable:!1})})]}),e.jsx(ue,{filled:!0,leftButton:{text:"Cancel",onClick:L},rightButton:{primary:!0,disabled:A,text:"Approve",loading:j,onClick:W}})]})};Vt.__docgenInfo={description:"",methods:[],displayName:"ApproveSignedDocument",props:{loading:{required:!0,tsType:{name:"boolean"},description:""},title:{required:!0,tsType:{name:"string"},description:""},logo:{required:!0,tsType:{name:"string"},description:""},domain:{required:!0,tsType:{name:"string"},description:""},contracts:{required:!0,tsType:{name:"Array",elements:[{name:"signature",type:"object",raw:`{
  type: string
  function: string
  value: string
}`,signature:{properties:[{key:"type",value:{name:"string",required:!0}},{key:"function",value:{name:"string",required:!0}},{key:"value",value:{name:"string",required:!0}}]}}],raw:`{
  type: string
  function: string
  value: string
}[]`},description:""},signatures:{required:!0,tsType:{name:"Array",elements:[{name:"EncodeTxSignature"}],raw:"EncodeTxSignature[]"},description:""},memo:{required:!0,tsType:{name:"string"},description:""},hasMemo:{required:!0,tsType:{name:"boolean"},description:""},isErrorNetworkFee:{required:!1,tsType:{name:"boolean"},description:""},isNetworkFeeLoading:{required:!0,tsType:{name:"boolean"},description:""},networkFee:{required:!0,tsType:{name:"union",raw:"NetworkFeeType | null",elements:[{name:"NetworkFeeType"},{name:"null"}]},description:""},transactionData:{required:!0,tsType:{name:"string"},description:""},opened:{required:!0,tsType:{name:"boolean"},description:""},argumentInfos:{required:!1,tsType:{name:"Array",elements:[{name:"GnoArgumentInfo"}],raw:"GnoArgumentInfo[]"},description:""},processing:{required:!0,tsType:{name:"boolean"},description:""},done:{required:!0,tsType:{name:"boolean"},description:""},transactionMessages:{required:!0,tsType:{name:"Array",elements:[{name:"ContractMessage"}],raw:"ContractMessage[]"},description:""},maxDepositAmount:{required:!1,tsType:{name:"number"},description:""},openScannerLink:{required:!0,tsType:{name:"signature",type:"function",raw:"(path: string, parameters?: { [key in string]: string }) => void",signature:{arguments:[{type:{name:"string"},name:"path"},{type:{name:"signature",type:"object",raw:"{ [key in string]: string }",signature:{properties:[{key:{name:"string",required:!0},value:{name:"string"}}]}},name:"parameters"}],return:{name:"void"}}},description:""},onToggleTransactionData:{required:!0,tsType:{name:"signature",type:"function",raw:"(opened: boolean) => void",signature:{arguments:[{type:{name:"boolean"},name:"opened"}],return:{name:"void"}}},description:""},onResponse:{required:!0,tsType:{name:"signature",type:"function",raw:"() => void",signature:{arguments:[],return:{name:"void"}}},description:""},onTimeout:{required:!0,tsType:{name:"signature",type:"function",raw:"() => void",signature:{arguments:[],return:{name:"void"}}},description:""},onClickConfirm:{required:!0,tsType:{name:"signature",type:"function",raw:"() => void",signature:{arguments:[],return:{name:"void"}}},description:""},onClickCancel:{required:!0,tsType:{name:"signature",type:"function",raw:"() => void",signature:{arguments:[],return:{name:"void"}}},description:""}}};const Oe="data:image/svg+xml,%3csvg%20width='100'%20height='100'%20viewBox='0%200%20100%20100'%20fill='none'%20xmlns='http://www.w3.org/2000/svg'%3e%3cpath%20fillRule='evenodd'%20clipRule='evenodd'%20d='M50%20100C77.6142%20100%20100%2077.6142%20100%2050C100%2022.3858%2077.6142%200%2050%200C22.3858%200%200%2022.3858%200%2050C0%2077.6142%2022.3858%20100%2050%20100ZM22.364%2071.4974L43.5%2050.3614L22%2028.8614L28.364%2022.4975L49.8639%2043.9974L71.8614%2021.9999L78.2254%2028.3639L56.2279%2050.3614L77.8614%2071.9949L71.4975%2078.3589L49.8639%2056.7254L28.7279%2077.8614L22.364%2071.4974Z'%20fill='%23EF2D21'/%3e%3c/svg%3e",bn=.001,jn={FAST:1.2,AVERAGE:1.1,SLOW:1},Pt=1,kn=1.2,Ht=m(P)`
  ${d.flex({align:"flex-start"})};
  width: 55px;
  height: 14px;
  align-self: center;
`,be=m(D)`
  ${d.flex({direction:"row",align:"normal",justify:"space-between"})};
  display: flex;
  width: 100%;
  padding: 14px 16px;
  gap: 8px;
  background-color: ${a("neutral","_9")};
  border-radius: 8px;
  transition: 0.2s;
  cursor: pointer;

  &.selected,
  &:hover {
    background-color: ${a("neutral","_7")};
  }

  & .title {
    ${d.flex({direction:"row"})};
    flex-shrink: 0;
    color: ${a("neutral","_1")};
    ${h.body1Bold}
  }

  & .no-data {
    ${h.body1Reg}
    color: ${a("neutral","_3")};
  }
`,zt={[I.FAST]:"Fast",[I.AVERAGE]:"Average",[I.SLOW]:"Slow"},We=({selected:t,isLoading:r,info:n,select:i})=>{const o=s.useMemo(()=>zt[n.settingType],[n.settingType]),l=!!n&&!!n.gasInfo&&!n.gasInfo.hasError,p=s.useMemo(()=>!l||!n?.gasInfo?"":E(n.gasInfo.gasFee).shiftedBy(ye.decimals*-1).toFixed(6,E.ROUND_UP).toString().replace(/0+$/,"")||"",[n.gasInfo]),g=s.useMemo(()=>l?ye.symbol:"-",[n.gasInfo]),c=()=>{l&&i()};return r?e.jsxs(be,{className:"loading",children:[e.jsx("span",{className:"title",children:o}),e.jsx(Ht,{})]}):e.jsxs(be,{className:t?"selected":"",onClick:c,children:[e.jsx("span",{className:"title",children:o}),l?e.jsx(Z,{value:p,denom:g,fontStyleKey:"body2Reg",minimumFontSize:"11px",orientation:"HORIZONTAL"}):e.jsx("span",{className:"no-data",children:"-"})]})};We.__docgenInfo={description:"",methods:[],displayName:"NetworkFeeSettingItem",props:{selected:{required:!0,tsType:{name:"boolean"},description:""},isLoading:{required:!0,tsType:{name:"boolean"},description:""},select:{required:!0,tsType:{name:"signature",type:"function",raw:"() => void",signature:{arguments:[],return:{name:"void"}}},description:""},info:{required:!0,tsType:{name:"signature",type:"object",raw:`{
  settingType: NetworkFeeSettingType
  gasInfo?: GasInfo | undefined
}`,signature:{properties:[{key:"settingType",value:{name:"NetworkFeeSettingType",required:!0}},{key:"gasInfo",value:{name:"union",raw:"GasInfo | undefined",elements:[{name:"GasInfo"},{name:"undefined"}],required:!1}}]}},description:""}}};const Qt=m.div`
  ${d.flex({align:"normal",justify:"normal"})};
  width: 100%;
  height: auto;

  & .content-wrapper {
    ${d.flex({direction:"column",justify:"space-between"})};
    width: 100%;
    margin-top: 20px;
  }

  & .settings-wrapper {
    ${d.flex({align:"normal",justify:"normal"})};
    width: 100%;
    gap: 10px;
  }

  & .custom-network-fee-input-wrapper {
    ${d.flex({align:"normal",justify:"normal"})};
    width: 100%;
    margin-top: 90px;
  }
`,Kt=[I.FAST,I.AVERAGE,I.SLOW],Ue=({isFetchedPriceTiers:t,changedGasInfo:r,networkFeeSettingType:n,setNetworkFeeSetting:i,networkFeeSettings:o,gasAdjustment:l,setGasAdjustment:p,onClickBack:g,onClickSave:c})=>{const u=s.useMemo(()=>o?o.reduce((x,$)=>(x[$.settingType]=$,x),{}):{[I.FAST]:null,[I.AVERAGE]:null,[I.SLOW]:null},[o]),w=s.useMemo(()=>Kt.map(x=>({...u[x],settingType:x})),[u]),y=s.useMemo(()=>r?E(r.gasFee).gt(0):!1,[r]),j=s.useCallback(x=>x?.settingType===n,[n]),C=s.useCallback(x=>E(x).isNaN()?Pt.toString():E(x).isGreaterThan(3)?"3":E(x).isLessThan(0)?"0":(p(x),x),[]);return e.jsxs(Qt,{children:[e.jsx(dt,{title:"Network Fee Setting",leftElement:{onClick:g,element:e.jsx("img",{src:`${pt}`,alt:"back image"})}}),e.jsxs("div",{className:"content-wrapper",children:[e.jsx("div",{className:"settings-wrapper",children:w.map((x,$)=>e.jsx(We,{selected:j(x),isLoading:!t,info:x,select:()=>i({settingType:x.settingType,storageDeposits:x.storageDeposits||{storageDeposit:0,unlockDeposit:0,storageUsage:0,releaseStorageUsage:0},gasInfo:{...x.gasInfo||{gasFee:0,gasPrice:0,gasUsed:0,gasWanted:0,simulateErrorMessage:null}}})},$))}),e.jsx("div",{className:"custom-network-fee-input-wrapper",children:e.jsx(ft,{value:l,changeValue:C})})]}),e.jsx(te,{hierarchy:"primary",fill:!1,text:"Save",onClick:c,disabled:!y})]})};Ue.__docgenInfo={description:"",methods:[],displayName:"NetworkFeeSetting",props:{isFetchedPriceTiers:{required:!0,tsType:{name:"boolean"},description:""},changedGasInfo:{required:!0,tsType:{name:"union",raw:"GasInfo | null",elements:[{name:"GasInfo"},{name:"null"}]},description:""},networkFeeSettingType:{required:!0,tsType:{name:"NetworkFeeSettingType"},description:""},setNetworkFeeSetting:{required:!0,tsType:{name:"signature",type:"function",raw:"(settingInfo: NetworkFeeSettingInfo) => void",signature:{arguments:[{type:{name:"NetworkFeeSettingInfo"},name:"settingInfo"}],return:{name:"void"}}},description:""},gasAdjustment:{required:!0,tsType:{name:"string"},description:""},setGasAdjustment:{required:!0,tsType:{name:"signature",type:"function",raw:"(ratio: string) => void",signature:{arguments:[{type:{name:"string"},name:"ratio"}],return:{name:"void"}}},description:""},networkFeeSettings:{required:!0,tsType:{name:"union",raw:"NetworkFeeSettingInfo[] | null",elements:[{name:"Array",elements:[{name:"NetworkFeeSettingInfo"}],raw:"NetworkFeeSettingInfo[]"},{name:"null"}]},description:""},onClickBack:{required:!0,tsType:{name:"signature",type:"function",raw:"() => void",signature:{arguments:[],return:{name:"void"}}},description:""},onClickSave:{required:!0,tsType:{name:"signature",type:"function",raw:"() => void",signature:{arguments:[],return:{name:"void"}}},description:""}}};const Zt=m.div`
  ${d.flex({direction:"column",justify:"flex-start"})};
  width: 100%;

  .error-message {
    position: relative;
    width: 100%;
    padding: 0 16px;
    ${h.captionReg};
    font-size: 13px;
    color: ${a("red","_5")};
    word-break: break-all;
  }
`,Yt=m.div`
  ${d.flex({direction:"row",justify:"space-between"})};
  width: 100%;
  padding: 14px 16px;
  background-color: ${a("neutral","_9")};
  border: 1px solid ${a("neutral","_7")};
  border-radius: 30px;
  ${({error:t,theme:r})=>!!t&&`border-color: ${r.red._5};`}

  & .key {
    ${d.flex({direction:"row"})};
    flex-shrink: 0;
    color: ${a("neutral","a")};
    ${h.body2Reg};
    gap: 4px;
  }

  & .storage-deposit-amount-wrapper {
    ${d.flex({direction:"row",justify:"flex-end"})};
    width: 100%;
    gap: 3px;
  }
`,Jt=m(P)`
  ${d.flex({align:"flex-start"})};
  width: 55px;
  height: 14px;
  align-self: center;
`;m.div`
  position: relative;
  ${d.flex({direction:"row"})};
  cursor: pointer;
`;m.div`
  position: absolute;
  bottom: 30px;
  background-color: ${a("neutral","_8")};
  width: 300px;
  height: auto;
  border-radius: 8px;
  padding: 16px;
  color: ${a("neutral","_2")};
  ${h.body2Reg};
  cursor: default;

  &::after {
    content: '';
    position: absolute;
    bottom: -14px;
    left: 50%;
    transform: translateX(-50%);
    width: 0;
    height: 0;
    border-left: 12.5px solid transparent;
    border-right: 12.5px solid transparent;
    border-top: 14px solid ${a("neutral","_8")};
    border-radius: 0 0 4px 4px;
  }
`;const Xt=`The total amount of GNOT deposited or
released for storage usage by this
transaction.`,Ge=({storageDeposit:t,isLoading:r=!1,isError:n,errorMessage:i,showPlaceholder:o=!1})=>{const l=s.useMemo(()=>t.storageDeposit===0&&t.unlockDeposit===0,[t.storageDeposit,t.unlockDeposit]),p=s.useMemo(()=>r?!1:n,[r,n]),g=s.useMemo(()=>l?0:Math.abs(t.storageDeposit-t.unlockDeposit),[l,t.storageDeposit]),c=s.useMemo(()=>l?!1:t.unlockDeposit>t.storageDeposit,[l,t.unlockDeposit,t.storageDeposit]);return e.jsxs(Zt,{children:[e.jsxs(Yt,{error:p?1:0,children:[e.jsxs("span",{className:"key",children:["Storage Deposit",e.jsx(O,{content:Xt})]}),e.jsx("div",{className:"storage-deposit-amount-wrapper",children:e.jsx(er,{value:g,isRefundable:c,isLoading:r,showPlaceholder:o})})]}),i&&e.jsx("span",{className:"error-message",children:i})]})},er=({value:t,isRefundable:r,isLoading:n,showPlaceholder:i=!1})=>{const o=r?fe.green._5:fe.neutral._1,l=s.useMemo(()=>t===0?{value:"0",denom:z.symbol}:{value:E(t).shiftedBy(z.decimals*-1).toFormat(z.decimals),denom:z.symbol},[t]);return n?e.jsx(Jt,{}):i?e.jsx("span",{className:"value",children:"-"}):e.jsx(Z,{value:l.value,denom:l.denom,fontColor:o,fontStyleKey:"body2Reg",minimumFontSize:"11px",orientation:"HORIZONTAL",withSign:r})};Ge.__docgenInfo={description:"",methods:[],displayName:"StorageDeposit",props:{storageDeposit:{required:!0,tsType:{name:"signature",type:"object",raw:`{
  storageDeposit: number
  unlockDeposit: number
}`,signature:{properties:[{key:"storageDeposit",value:{name:"number",required:!0}},{key:"unlockDeposit",value:{name:"number",required:!0}}]}},description:""},isLoading:{required:!1,tsType:{name:"boolean"},description:"",defaultValue:{value:"false",computed:!1}},isError:{required:!1,tsType:{name:"boolean"},description:""},errorMessage:{required:!1,tsType:{name:"string"},description:""},showPlaceholder:{required:!1,tsType:{name:"boolean"},description:"",defaultValue:{value:"false",computed:!1}}}};const tr=m.div`
  ${d.flex({justify:"flex-start"})};
  padding: 24px 20px;
`,je=m.div`
  ${d.flex({justify:"flex-start"})};
  width: 100%;
  padding: 0 20px;
  padding-bottom: 96px;
  align-self: center;

  .row {
    ${d.flex({direction:"row"})};
    position: relative;
    padding: 10px 18px;
    justify-content: space-between;
    border-bottom: 2px solid ${a("neutral","_8")};
    ${h.body1Reg};

    &:last-child {
      border-bottom: none;
    }

    .key {
      display: inline-flex;
      width: fit-content;
      flex-shrink: 0;
      color: ${a("neutral","a")};
    }

    .value {
      display: block;
      max-width: 204px;
      text-align: right;
      text-overflow: ellipsis;
      overflow: hidden;
    }
  }

  .main-title {
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
    ${d.flex({direction:"row",align:"center",justify:"center"})};
    width: 100%;
    min-height: 41px;
    border-radius: 24px;
    padding: 10px 18px;
    margin: 24px auto 12px auto;
    gap: 7px;
    background-color: ${a("neutral","_9")};
    ${h.body2Reg};

    .logo {
      width: 20px;
      height: 20px;
      border-radius: 50%;
    }
  }

  .info-table {
    width: 100%;
    height: auto;
    border-radius: 18px;
    margin-bottom: 8px;
    background-color: ${a("neutral","_9")};
  }

  .memo-wrapper {
    width: 100%;
    min-height: 48px;
    border-radius: 30px;
    padding: 10px 18px;
    margin-bottom: 8px;
    background-color: ${a("neutral","_9")};
    border: 1px solid ${a("neutral","_8")};
    gap: 10px;
    ${h.body2Reg};

    span.value {
      display: block;
      width: 100%;
      max-width: 100%;
      height: auto;
      word-break: break-all;
      overflow: hidden;
      white-space: nowrap;
      text-overflow: ellipsis;
    }

    input.value {
      display: block;
      width: 100%;
      max-width: 100%;
      height: auto;

      &::placeholder {
        color: ${a("neutral","a")};
      }
    }

    &.editable {
      border: 1px solid ${a("neutral","_7")};
    }
  }

  .fee-amount-wrapper {
    ${d.flex({justify:"flex-start"})};
    width: 100%;
    gap: 8px;
    margin-bottom: 8px;
  }

  .error-message {
    position: relative;
    width: 100%;
    padding: 0 16px;
    ${h.captionReg};
    font-size: 13px;
    color: ${a("red","_5")};
    white-space: pre-line;
  }

  .simulate-error-banner {
    width: 100%;
    min-height: 40px;
    padding: 10px 16px;
    border-radius: 18px;
    background-color: rgba(239, 45, 33, 0.08);
    border: 1px solid ${a("red","_5")};
    margin-bottom: 8px;
    font-family: 'Poppins', sans-serif;
    font-weight: 500;
    font-size: 13px;
    line-height: 20px;
    color: ${a("red","_5")};
    word-break: break-word;

    .error-label {
      font-weight: 700;
    }
  }

  .transaction-data-wrapper {
    width: 100%;
    ${h.body2Reg};
    ${d.flex()};

    .visible-button {
      color: ${a("neutral","a")};
      height: fit-content;
      margin-bottom: 5px;

      img {
        margin-left: 3px;
      }
    }
    .textarea-wrapper {
      width: 100%;
      height: 200px;
      border-radius: 24px;
      background-color: ${a("neutral","_9")};
      border: 1px solid ${a("neutral","_7")};
      padding: 12px 16px;
    }
    .raw-info-textarea {
      width: 100%;
      height: 100%;
      overflow: auto;
      ${h.body2Reg};
      resize: none;
    }
    .raw-info-textarea::-webkit-scrollbar {
      width: 2px;
      padding: 1px 1px 1px 0px;
      margin-right: 10px;
    }

    .raw-info-textarea::-webkit-scrollbar-thumb {
      background-color: darkgrey;
    }

    .raw-info-textarea::-webkit-resizer {
      display: none !important;
    }

    margin-bottom: 20px;
  }

  .error-detail-wrapper {
    ${d.flex({direction:"column",justify:"flex-start",align:"stretch"})};
    width: 100%;
    margin-top: 24px;
    gap: 16px;
  }

  .error-detail-icon {
    width: 48px;
    height: 48px;
    margin: 0 auto;
  }

  .error-detail-title {
    text-align: center;
    color: ${a("red","_5")};
    ${h.header4};
  }

  .error-detail-description,
  .error-detail-suggestion {
    text-align: center;
    color: ${a("neutral","a")};
    ${h.body2Reg};
    white-space: pre-line;
  }

  .error-detail-suggestion {
    color: ${a("neutral","b")};
  }

  .error-detail-raw-toggle {
    width: 100%;
    text-align: left;
    color: ${a("neutral","a")};
    ${h.captionReg};
    margin-top: 8px;
  }

  .error-detail-raw-box {
    width: 100%;
    max-height: 120px;
    overflow: auto;
    border-radius: 12px;
    background-color: ${a("neutral","_9")};
    border: 1px solid ${a("neutral","_7")};
    padding: 12px;
    ${h.captionReg};
    color: ${a("neutral","b")};
    white-space: pre-wrap;
    word-break: break-all;
  }
`,rr=({loading:t,title:r,logo:n,domain:i,transactionMessages:o,memo:l,currentBalance:p,hasMemo:g,networkFee:c,isErrorNetworkFee:u,transactionData:w,opened:y,processing:j,done:C,useNetworkFeeReturn:x,argumentInfos:$,maxDepositAmount:k,changeTransactionMessages:q,changeMemo:L,onToggleTransactionData:M,onResponse:A,onClickConfirm:v,onClickCancel:W,openScannerLink:re,requiresHoldConfirmation:f=!1,onFinishHold:N,errorDetail:T=null,onCloseWithResponse:H,simulateErrorBannerMessage:R,messageErrors:Ke,hasArgumentValidationError:U=!1})=>{const[Ze,ne]=s.useState(!1),[ge,Ye]=s.useState(!1),xe=s.useRef(null),ae=s.useRef(!1),ie=s.useMemo(()=>f||x.isLoading||u||x.isSimulateError||U?!0:Number(c?.amount||0)<=0,[f,u,x.isLoading,x.isSimulateError,U,c]),se=s.useMemo(()=>!k||p===void 0?!1:p<k,[p,k]),Je=s.useMemo(()=>x.isLoading?"":se?"Insufficient balance":"",[x.isLoading,se]),Xe=s.useMemo(()=>u?"Insufficient network fee":"",[u]),et=s.useCallback(oe=>{if(g)return;const it=oe.target.value;L(it)},[g,L]),tt=s.useCallback(()=>{ne(!0)},[]),rt=s.useCallback(()=>{ne(!1)},[]),nt=s.useCallback(()=>{x.save(),ne(!1)},[x.save]),at=s.useCallback(()=>{ie||f||v()},[v,ie,f]);return s.useEffect(()=>{C&&!T&&A()},[C,T,A]),s.useEffect(()=>{R&&!ae.current&&(ae.current=!0,requestAnimationFrame(()=>{xe.current?.scrollIntoView({behavior:"smooth",block:"center"})})),R||(ae.current=!1)},[R]),t?e.jsx(_e,{rightButtonText:"Approve"}):Ze?e.jsx(tr,{children:e.jsx(Ue,{...x,onClickBack:rt,onClickSave:nt})}):C&&T&&H?e.jsxs(je,{$isErrorNetworkFee:!1,children:[e.jsx(b,{className:"main-title",type:"header4",children:r}),e.jsxs("div",{className:"domain-wrapper",children:[e.jsx("img",{className:"logo",src:n||le,alt:"logo img"}),e.jsx("span",{children:i})]}),e.jsxs("div",{className:"error-detail-wrapper",children:[e.jsx("img",{src:Oe,alt:"error",className:"error-detail-icon"}),e.jsx(b,{className:"error-detail-title",type:"header4",children:T.title}),e.jsx(b,{className:"error-detail-description",type:"body2Reg",children:T.description}),T.suggestion&&e.jsx(b,{className:"error-detail-suggestion",type:"body2Reg",children:T.suggestion}),T.rawError&&e.jsxs(e.Fragment,{children:[e.jsxs(_,{hierarchy:"custom",bgColor:"transparent",className:"error-detail-raw-toggle",onClick:()=>Ye(oe=>!oe),children:[ge?"Hide":"Show"," ","error details"]}),ge&&e.jsx("div",{className:"error-detail-raw-box",children:T.rawError})]})]}),e.jsx(te,{fill:!0,text:"Close",onClick:H})]}):e.jsxs(je,{$isErrorNetworkFee:u||!1,children:[e.jsx(b,{className:"main-title",type:"header4",children:r}),e.jsxs("div",{className:"domain-wrapper",children:[e.jsx("img",{className:"logo",src:n||le,alt:"logo img"}),e.jsx("span",{children:i})]}),e.jsx(pe,{messages:o,argumentInfos:$,changeMessages:q,openScannerLink:re,messageErrors:Ke}),e.jsxs("div",{className:g?"memo-wrapper row":"memo-wrapper editable row",children:[e.jsx("span",{className:"key",children:"Memo:"}),g?e.jsx("span",{className:"value",children:l}):e.jsx("input",{type:"text",className:"value",value:l,onChange:et,autoComplete:"off",placeholder:"(Optional)"})]}),e.jsxs("div",{className:"fee-amount-wrapper",children:[e.jsx(Ge,{storageDeposit:{storageDeposit:x.currentStorageDeposits?.storageDeposit||0,unlockDeposit:x.currentStorageDeposits?.unlockDeposit||0},isLoading:!U&&x.isLoading,isError:se,errorMessage:Je,showPlaceholder:U}),e.jsx(ce,{value:c?.amount||"",denom:c?.denom||"",isError:u,isLoading:!U&&x.isLoading,errorMessage:Xe,onClickSetting:tt})]}),R&&e.jsxs("div",{ref:xe,className:"simulate-error-banner",children:[e.jsx("span",{className:"error-label",children:"ERROR: "}),e.jsx("span",{className:"error-text",children:R})]}),e.jsxs("div",{className:"transaction-data-wrapper",children:[e.jsx(_,{hierarchy:"custom",bgColor:"transparent",className:"visible-button",onClick:()=>M(!y),children:y?e.jsxs(e.Fragment,{children:[e.jsx(e.Fragment,{children:"Hide Transaction Data"}),e.jsx("img",{src:Le})]}):e.jsxs(e.Fragment,{children:[e.jsx(e.Fragment,{children:"View Transaction Data"}),e.jsx("img",{src:qe})]})}),y&&e.jsx("div",{className:"textarea-wrapper",children:e.jsx("textarea",{className:"raw-info-textarea",value:w,readOnly:!0,draggable:!1})})]}),e.jsx(ue,{filled:!0,leftButton:{text:"Cancel",onClick:W},rightButton:f&&N?{type:"hold",onFinishHold:N}:{primary:!0,disabled:ie,text:"Approve",loading:j,onClick:at}})]})};rr.__docgenInfo={description:"",methods:[],displayName:"ApproveTransaction",props:{loading:{required:!0,tsType:{name:"boolean"},description:""},title:{required:!0,tsType:{name:"string"},description:""},logo:{required:!0,tsType:{name:"string"},description:""},domain:{required:!0,tsType:{name:"string"},description:""},contracts:{required:!0,tsType:{name:"Array",elements:[{name:"signature",type:"object",raw:`{
  type: string
  function: string
  value: string
}`,signature:{properties:[{key:"type",value:{name:"string",required:!0}},{key:"function",value:{name:"string",required:!0}},{key:"value",value:{name:"string",required:!0}}]}}],raw:`{
  type: string
  function: string
  value: string
}[]`},description:""},memo:{required:!0,tsType:{name:"string"},description:""},hasMemo:{required:!0,tsType:{name:"boolean"},description:""},currentBalance:{required:!1,tsType:{name:"number"},description:""},isErrorNetworkFee:{required:!1,tsType:{name:"boolean"},description:""},networkFee:{required:!0,tsType:{name:"union",raw:"NetworkFeeType | null",elements:[{name:"NetworkFeeType"},{name:"null"}]},description:""},transactionData:{required:!0,tsType:{name:"string"},description:""},opened:{required:!0,tsType:{name:"boolean"},description:""},argumentInfos:{required:!1,tsType:{name:"Array",elements:[{name:"GnoArgumentInfo"}],raw:"GnoArgumentInfo[]"},description:""},processing:{required:!0,tsType:{name:"boolean"},description:""},done:{required:!0,tsType:{name:"boolean"},description:""},transactionMessages:{required:!0,tsType:{name:"Array",elements:[{name:"ContractMessage"}],raw:"ContractMessage[]"},description:""},maxDepositAmount:{required:!1,tsType:{name:"number"},description:""},changeTransactionMessages:{required:!0,tsType:{name:"signature",type:"function",raw:"(messages: ContractMessage[]) => void",signature:{arguments:[{type:{name:"Array",elements:[{name:"ContractMessage"}],raw:"ContractMessage[]"},name:"messages"}],return:{name:"void"}}},description:""},changeMemo:{required:!0,tsType:{name:"signature",type:"function",raw:"(memo: string) => void",signature:{arguments:[{type:{name:"string"},name:"memo"}],return:{name:"void"}}},description:""},openScannerLink:{required:!0,tsType:{name:"signature",type:"function",raw:"(path: string, parameters?: { [key in string]: string }) => void",signature:{arguments:[{type:{name:"string"},name:"path"},{type:{name:"signature",type:"object",raw:"{ [key in string]: string }",signature:{properties:[{key:{name:"string",required:!0},value:{name:"string"}}]}},name:"parameters"}],return:{name:"void"}}},description:""},onToggleTransactionData:{required:!0,tsType:{name:"signature",type:"function",raw:"(opened: boolean) => void",signature:{arguments:[{type:{name:"boolean"},name:"opened"}],return:{name:"void"}}},description:""},onResponse:{required:!0,tsType:{name:"signature",type:"function",raw:"() => void",signature:{arguments:[],return:{name:"void"}}},description:""},onTimeout:{required:!0,tsType:{name:"signature",type:"function",raw:"() => void",signature:{arguments:[],return:{name:"void"}}},description:""},onClickConfirm:{required:!0,tsType:{name:"signature",type:"function",raw:"() => void",signature:{arguments:[],return:{name:"void"}}},description:""},onClickCancel:{required:!0,tsType:{name:"signature",type:"function",raw:"() => void",signature:{arguments:[],return:{name:"void"}}},description:""},useNetworkFeeReturn:{required:!0,tsType:{name:"UseNetworkFeeReturn"},description:""},requiresHoldConfirmation:{required:!1,tsType:{name:"boolean"},description:"",defaultValue:{value:"false",computed:!1}},onFinishHold:{required:!1,tsType:{name:"signature",type:"function",raw:"(finished: boolean) => void",signature:{arguments:[{type:{name:"boolean"},name:"finished"}],return:{name:"void"}}},description:""},errorDetail:{required:!1,tsType:{name:"union",raw:"TransactionErrorDetailType | null",elements:[{name:"TransactionErrorDetailType"},{name:"null"}]},description:"When set, shows detailed error UI instead of calling onResponse immediately (user must tap Close)",defaultValue:{value:"null",computed:!1}},onCloseWithResponse:{required:!1,tsType:{name:"signature",type:"function",raw:"() => void",signature:{arguments:[],return:{name:"void"}}},description:"Called when user closes the error view; send failure response then close popup"},simulateErrorBannerMessage:{required:!1,tsType:{name:"union",raw:"string | null",elements:[{name:"string"},{name:"null"}]},description:"Global error banner message shown between fee section and transaction data (from simulate error)"},messageErrors:{required:!1,tsType:{name:"Array",elements:[{name:"unknown"}],raw:"(string | undefined)[]"},description:"Per-message validation errors - array aligned with transactionMessages"},hasArgumentValidationError:{required:!1,tsType:{name:"boolean"},description:"Whether argument type validation failed (disables Approve)",defaultValue:{value:"false",computed:!1}}}};const te=({hierarchy:t="dark",text:r="Close",fill:n=!0,disabled:i=!1,onClick:o})=>{const l=S.useCallback(()=>{o()},[o]);return e.jsx(nr,{fill:n?"fill":"none",children:e.jsx(_,{fullWidth:!0,hierarchy:t,disabled:i,onClick:l,children:e.jsx(b,{type:"body1Bold",children:r})})})},nr=m.div`
  ${d.flex({direction:"row"})};
  position: fixed;
  bottom: 0px;
  left: 0px;
  width: 100%;
  height: 96px;
  padding: 0px 20px;
  z-index: 1;

  ${({fill:t,theme:r})=>t==="fill"?K`
          box-shadow: 0px -4px 4px rgba(0, 0, 0, 0.4);
          background-color: ${r.neutral._8};
        `:K`
          background-color: transparent;
        `}
`;te.__docgenInfo={description:"",methods:[],displayName:"BottomFixedButton",props:{hierarchy:{required:!1,tsType:{name:"ButtonProps['hierarchy']",raw:"ButtonProps['hierarchy']"},description:"",defaultValue:{value:"'dark'",computed:!1}},text:{required:!1,tsType:{name:"string"},description:"",defaultValue:{value:"'Close'",computed:!1}},fill:{required:!1,tsType:{name:"boolean"},description:"",defaultValue:{value:"true",computed:!1}},disabled:{required:!1,tsType:{name:"boolean"},description:"",defaultValue:{value:"false",computed:!1}},onClick:{required:!0,tsType:{name:"signature",type:"function",raw:"() => unknown",signature:{arguments:[],return:{name:"unknown"}}},description:""}}};function ke(t){return`${t.primary&&"primary"} ${t.disabled&&"disabled"}`}const ar=({leftButton:t,rightButton:r,filled:n})=>{const i=s.useMemo(()=>ke(t),[t]),o=s.useMemo(()=>ke(r),[r]),l=s.useCallback(()=>{t.onClick()},[t]),p=s.useCallback(()=>{r.onClick()},[r]);return e.jsxs(ir,{$filled:n,children:[e.jsx(_,{className:i,fullWidth:!0,onClick:l,children:e.jsx(b,{type:"body1Bold",children:t.text})}),e.jsx(_,{className:o,fullWidth:!0,onClick:p,children:e.jsx(b,{type:"body1Bold",children:r.text})})]})},ir=m.div`
  ${d.flex({direction:"row",align:"flex-start"})};
  position: fixed;
  left: 0px;
  width: 100%;
  padding: 0 20px;
  height: ${({$filled:t})=>t?"96px":"48px"};
  bottom: ${({$filled:t})=>t?"0":"24px"};
  ${({$filled:t})=>t&&"box-shadow: 0px -4px 4px rgba(0, 0, 0, 0.4);"}
  ${({$filled:t})=>t&&"align-items: center;"}
  background-color: ${({$filled:t,theme:r})=>t?r.neutral._8:"transparent"};
  z-index: 1;

  & > button {
    margin-right: 10px;
    background-color: ${a("neutral","_5")};

    &:last-child {
      margin-right: 0;
    }

    &:hover:not(.disabled) {
      background-color: ${a("neutral","_6")};
    }

    &.primary {
      background-color: ${a("primary","_6")};

      &:hover:not(.disabled) {
        background-color: ${a("primary","_7")};
      }
    }
  }

  & > button.disabled {
    cursor: default;
    color: ${a("neutral","_5")};
    background-color: ${a("neutral","_7")};

    &.primary {
      background-color: ${a("primary","_9")};
    }
  }
`;ar.__docgenInfo={description:"",methods:[],displayName:"BottomFixedButtonGroup",props:{leftButton:{required:!0,tsType:{name:"ButtonProps"},description:""},rightButton:{required:!0,tsType:{name:"ButtonProps"},description:""},filled:{required:!1,tsType:{name:"boolean"},description:""}}};const sr=gt`
  from {
    width: 0;
  }
  to {
    width: 100%;
  }
`,or=m.button`
  position: relative;
  overflow: hidden;
  display: flex;
  width: 100%;
  height: 48px;
  justify-content: center;
  align-items: center;
  border-radius: 30px;
  border: none;
  background-color: ${({theme:t})=>t.webWarning._100} !important;
  color: ${({theme:t})=>t.neutral._1} !important;
  cursor: pointer;
  user-select: none;
  transition: background-color 0.2s;
  text-align: left;

  ${({pressed:t,finish:r})=>t&&!r?K`
          &::before {
            content: '';
            z-index: 0;
            position: absolute;
            top: 0;
            left: 0;
            height: 100%;
            background: rgba(0, 0, 0, 0.2) !important;
            border-radius: 30px;
            animation: ${sr} 3s linear forwards;
          }
        `:K`
          &:hover {
            opacity: 0.9;
          }
        `}
`,lr=m.div`
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  gap: 6px;
`,dr=e.jsxs(e.Fragment,{children:[e.jsx("b",{style:{fontWeight:700},children:"WARNING:"})," ","Parameter changes have been detected. Hold to proceed only if you trust the updated parameters."]}),Ve=({onFinishHold:t})=>{const[r,n]=s.useState(!1),[i,o]=s.useState(!1),l=s.useCallback(()=>{r&&n(!1)},[r]),p=s.useCallback(()=>{if(i){o(!1);return}n(!0)},[i]),g=s.useCallback(()=>{l()},[l]),c=s.useCallback(()=>{l()},[l]);return s.useEffect(()=>{t(i)},[i,t]),s.useEffect(()=>{let u;return r&&(u=setTimeout(()=>{o(!0)},3e3)),()=>{clearTimeout(u)}},[r]),e.jsx(or,{pressed:r,finish:i,onMouseDown:p,onMouseUp:g,onMouseLeave:c,children:e.jsxs(lr,{children:[e.jsx(b,{type:"body1Bold",children:"Hold"}),e.jsx(O,{content:dr,iconColor:"#FFFFFF"})]})})};Ve.__docgenInfo={description:"",methods:[],displayName:"ApproveHoldButton",props:{onFinishHold:{required:!0,tsType:{name:"signature",type:"function",raw:"(finished: boolean) => void",signature:{arguments:[{type:{name:"boolean"},name:"finished"}],return:{name:"void"}}},description:""}}};function Te(t){return`${t.primary&&"primary"} ${t.disabled&&"disabled"}`}const ue=({leftButton:t,rightButton:r,filled:n})=>{const i=s.useMemo(()=>Te(t),[t]),o=s.useCallback(()=>{t.onClick()},[t]),l="type"in r&&r.type==="hold",p=s.useMemo(()=>l?"":Te(r),[r,l]),g=s.useCallback(()=>{l||r.onClick()},[r,l]);return e.jsxs(pr,{$filled:n,children:[e.jsx(Ce,{className:i,loading:t.loading,text:t.text,onClick:o}),l?e.jsx(Ve,{onFinishHold:r.onFinishHold}):e.jsx(Ce,{className:p,loading:r.loading,text:r.text,onClick:g})]})},Ce=({loading:t,className:r,text:n,onClick:i})=>e.jsx(_,{className:r,fullWidth:!0,onClick:i,children:t?e.jsx(ot,{}):e.jsx(b,{type:"body1Bold",children:n})}),pr=m.div`
  ${d.flex({direction:"row",align:"flex-start"})};
  position: fixed;
  left: 0px;
  width: 100%;
  padding: 0 20px;
  height: ${({$filled:t})=>t?"96px":"48px"};
  bottom: ${({$filled:t})=>t?"0":"24px"};
  ${({$filled:t})=>t&&"box-shadow: 0px -4px 4px rgba(0, 0, 0, 0.4);"}
  ${({$filled:t})=>t&&"align-items: center;"}
  background-color: ${({$filled:t,theme:r})=>t?r.neutral._8:"transparent"};
  z-index: 9;

  & > button {
    margin-right: 10px;
    background-color: ${a("neutral","_5")};

    &:last-child {
      margin-right: 0;
    }

    &:hover:not(.disabled) {
      background-color: ${a("neutral","_6")};
    }

    &.primary {
      background-color: ${a("primary","_6")};

      &:hover:not(.disabled) {
        background-color: ${a("primary","_7")};
      }
    }
  }

  & > button.disabled {
    cursor: default;
    color: ${a("neutral","_5")};
    background-color: ${a("neutral","_7")};

    &.primary {
      background-color: ${a("primary","_9")};
    }
  }
`;ue.__docgenInfo={description:"",methods:[],displayName:"BottomFixedLoadingButtonGroup",props:{leftButton:{required:!0,tsType:{name:"ButtonProps"},description:""},rightButton:{required:!0,tsType:{name:"union",raw:"ButtonProps | HoldButtonProps",elements:[{name:"ButtonProps"},{name:"HoldButtonProps"}]},description:""},filled:{required:!1,tsType:{name:"boolean"},description:""}}};const cr=m.div`
  margin-top: auto;
  ${d.flex({direction:"row",justify:"space-between"})};
  width: 100%;
  gap: 10px;
`,ur=({cancelButtonProps:t,confirmButtonProps:r})=>e.jsxs(cr,{children:[e.jsx(_,{fullWidth:!0,hierarchy:"dark",onClick:t.onClick,...t.props,children:e.jsx(b,{type:"body1Bold",children:"Cancel"})}),e.jsx(_,{fullWidth:!0,hierarchy:r.hierarchy??"primary",onClick:r.onClick,...r.props,children:e.jsx(b,{type:"body1Bold",children:r.text})})]});ur.__docgenInfo={description:"",methods:[],displayName:"CancelAndConfirmButton",props:{cancelButtonProps:{required:!0,tsType:{name:"DefaultButtonProps"},description:""},confirmButtonProps:{required:!0,tsType:{name:"ConfirmButtonProps"},description:""}}};const mr=({onClick:t})=>e.jsx(gr,{children:e.jsx(_,{fullWidth:!0,hierarchy:"dark",onClick:t,children:e.jsx(b,{type:"body1Bold",children:"Close"})})}),gr=m.div`
  ${d.flex({direction:"row"})};
  position: fixed;
  bottom: 0px;
  left: 0px;
  width: 100%;
  height: 96px;
  padding: 0px 20px;
  box-shadow: 0px -4px 4px rgba(0, 0, 0, 0.4);
  background-color: ${a("neutral","_8")};
  z-index: 1;
`;mr.__docgenInfo={description:"",methods:[],displayName:"CloseShadowButton",props:{onClick:{required:!0,tsType:{name:"signature",type:"function",raw:"() => void",signature:{arguments:[],return:{name:"void"}}},description:""}}};const xr=m.div`
  ${d.flex({direction:"row",justify:"space-between"})};
  width: 100%;
  gap: 10px;
  ${({margin:t})=>t&&`margin: ${t}`};
`,hr=({margin:t,leftProps:r,rightProps:n})=>e.jsxs(xr,{margin:t,children:[e.jsx(_,{fullWidth:!0,hierarchy:r.hierarchy??"dark",onClick:r.onClick,bgColor:r.bgColor,...r.props,children:e.jsx(b,{type:r.fontType??"body1Bold",children:r.text})}),e.jsx(_,{fullWidth:!0,hierarchy:n.hierarchy??"primary",onClick:n.onClick,bgColor:n.bgColor,...n.props,children:e.jsx(b,{type:n.fontType??"body1Bold",children:n.text})})]});hr.__docgenInfo={description:"",methods:[],displayName:"DoubleButton",props:{margin:{required:!1,tsType:{name:"string"},description:""},leftProps:{required:!0,tsType:{name:"EachButtonProps"},description:""},rightProps:{required:!0,tsType:{name:"EachButtonProps"},description:""}}};const fr=m.main`
  ${d.flex({justify:"flex-start"})};
`,yr=m.div`
  ${d.flex({align:"flex-start",justify:"flex-start"})};
  position: relative;
  width: 100%;
  gap: 16px;
  padding-top: 35px;

  .icon {
    width: 100px;
    height: 100px;
    margin: 20px auto;
  }

  div {
    text-align: center;
  }
`,$e={title:"Failed to load assets",desc:`We couldn’t load your assets. Please
check your connection with the network
and try again.`},Pe=()=>e.jsx(fr,{children:e.jsxs(yr,{children:[e.jsx("img",{className:"icon",src:Oe,alt:"fail-image"}),e.jsx(me,{title:$e.title,desc:$e.desc})]})});Pe.__docgenInfo={description:"",methods:[],displayName:"ErrorNetwork"};const wr=({failedNetwork:t,children:r})=>{const[n]=he(xt),[i]=he(ht);return s.useMemo(()=>n?t===!0:!1,[t,n,i])?e.jsx(Pe,{}):e.jsx(S.Fragment,{children:r})};wr.__docgenInfo={description:"",methods:[],displayName:"ErrorContainer",props:{failedNetwork:{required:!0,tsType:{name:"union",raw:"boolean | null",elements:[{name:"boolean"},{name:"null"}]},description:""},children:{required:!0,tsType:{name:"ReactReactNode",raw:"React.ReactNode"},description:""}}};const vr=m.div`
  ${d.flex({align:"flex-start",justify:"flex-start"})};
  position: relative;
  width: 100%;
  gap: 16px;
`,br=m.div`
  ${d.flex({direction:"row",justify:"flex-start"})}
  width: 100%;
  gap: 16px;
`,jr=m(P)`
  ${d.flex({align:"flex-end",justify:"space-between"})}
  width: 100%;
  aspect-ratio: 1;
  flex: 1;
  padding: 10px;
`,kr=()=>e.jsx(br,{children:Array.from({length:2},(t,r)=>e.jsx(jr,{children:e.jsx(G,{width:"100%",height:"20px",radius:"8px"})},r))}),Tr=()=>e.jsx(vr,{children:Array.from({length:2},(t,r)=>e.jsx(kr,{},r))});Tr.__docgenInfo={description:"",methods:[],displayName:"LoadingNft"};m.div`
  position: relative;
  width: 100%;
  height: 140px;
  border: 1px solid ${a("neutral","_7")};
  background-color: ${a("neutral","_9")};
  border-radius: 18px;
  padding: 8px;
`;m.div`
  width: 100%;
  height: 100%;
  overflow-y: auto;
  display: grid;
  grid-template-columns: 1fr 1fr 1fr 1fr;
  gap: 20px;
  padding: 10px 18px;
  .seed-text {
    ${d.flex({direction:"row"})}
  }
`;m.div`
  ${d.flex({direction:"row",justify:"space-between"})};
  width: 100%;
  margin: 12px auto auto;
  padding: 0px 45px;
`;m(_)`
  ${d.flex({direction:"row"})};
  height: 25px;
  border-radius: 12.5px;
  padding: 0px 12px;
  transition: background-color 0.4s ease;
  &:hover {
    background-color: ${a("neutral","b")};
  }
`;const Cr="data:image/svg+xml,%3csvg%20width='20'%20height='20'%20viewBox='0%200%2020%2020'%20fill='none'%20xmlns='http://www.w3.org/2000/svg'%3e%3crect%20x='0.5'%20y='0.5'%20width='19'%20height='19'%20rx='3.5'%20stroke='%23777777'/%3e%3c/svg%3e",$r="data:image/svg+xml,%3csvg%20width='20'%20height='20'%20viewBox='0%200%2020%2020'%20fill='none'%20xmlns='http://www.w3.org/2000/svg'%3e%3crect%20width='20'%20height='20'%20rx='4'%20fill='%230043C1'/%3e%3cpath%20d='M6%2010L8.66667%2014L14%206'%20stroke='white'%20strokeWidth='1.5'%20strokeLinecap='round'%20strokeLinejoin='round'/%3e%3c/svg%3e",Nr=m.div`
  ${d.flex({direction:"row",justify:"flex-start"})};
  width: 100%;
  margin: ${({margin:t})=>t??"0px 0px 10px"};
  ${h.body2Reg};
`,_r=m.label`
  ${d.flex({direction:"row",justify:"flex-start"})};
  position: relative;
  padding-left: 28px;
  cursor: pointer;
  &:before {
    ${({checkboxPos:t})=>t==="TOP"?d.posTopLeft("2px"):d.posTopCenterLeft()};
    content: '';
    display: inline-block;
    width: 20px;
    height: 20px;
    margin-right: 12px;
    background: url(${Cr}) no-repeat center center;
  }
  .terms-button {
    text-decoration-line: underline;
    text-underline-offset: 2px;
    text-decoration-thickness: 1px;
  }
  &,
  * {
    font: inherit;
      color: ${({color:t,theme:r})=>t??r.neutral.a};
  }
`,Ar=m.input`
  display: none;
  &[type='checkbox'] {
    width: 0px;
    height: 0px;
    white-space: nowrap;
    &:checked + label:before {
      background: url(${$r}) no-repeat center center;
    }
  }
`,qr=({checked:t,onChange:r,text:n,children:i,tabIndex:o,checkboxPos:l="CENTER",className:p="",margin:g,id:c="",color:u})=>e.jsxs(Nr,{className:p,margin:g,color:u,children:[e.jsx(Ar,{id:c||"terms",type:"checkbox",checked:t,onChange:r,tabIndex:o}),e.jsxs(_r,{htmlFor:c||"terms",checkboxPos:l,color:u,children:[n&&n,i]})]});qr.__docgenInfo={description:"",methods:[],displayName:"TermsCheckbox",props:{checked:{required:!0,tsType:{name:"boolean"},description:""},onChange:{required:!0,tsType:{name:"signature",type:"function",raw:"(e: React.ChangeEvent<HTMLInputElement>) => void",signature:{arguments:[{type:{name:"ReactChangeEvent",raw:"React.ChangeEvent<HTMLInputElement>",elements:[{name:"HTMLInputElement"}]},name:"e"}],return:{name:"void"}}},description:""},text:{required:!1,tsType:{name:"string"},description:""},children:{required:!1,tsType:{name:"ReactReactNode",raw:"React.ReactNode"},description:""},tabIndex:{required:!0,tsType:{name:"number"},description:""},checkboxPos:{required:!1,tsType:{name:"union",raw:"'CENTER' | 'TOP' | ' BOTTOM'",elements:[{name:"literal",value:"'CENTER'"},{name:"literal",value:"'TOP'"},{name:"literal",value:"' BOTTOM'"}]},description:"",defaultValue:{value:"'CENTER'",computed:!1}},className:{required:!1,tsType:{name:"string"},description:"",defaultValue:{value:"''",computed:!1}},margin:{required:!1,tsType:{name:"string"},description:""},id:{required:!1,tsType:{name:"string"},description:"",defaultValue:{value:"''",computed:!1}},color:{required:!1,tsType:{name:"string"},description:""}}};const Lr=m.div`
  display: grid;
  gap: 12px;
  width: 100%;
  text-align: left;
`,me=({title:t,desc:r,isWarningDesc:n=!1,className:i=""})=>{const o=Ne();return e.jsxs(Lr,{className:i,children:[e.jsx(b,{type:"header4",children:t}),e.jsx(b,{type:"body1Reg",color:n?o.red.a:o.neutral.a,children:r})]})};me.__docgenInfo={description:"",methods:[],displayName:"TitleWithDesc",props:{title:{required:!0,tsType:{name:"string"},description:""},desc:{required:!0,tsType:{name:"string"},description:""},isWarningDesc:{required:!1,tsType:{name:"boolean"},description:"",defaultValue:{value:"false",computed:!1}},className:{required:!1,tsType:{name:"string"},description:"",defaultValue:{value:"''",computed:!1}}}};const Q="data:image/svg+xml,%3csvg%20width='34'%20height='34'%20viewBox='0%200%2034%2034'%20fill='none'%20xmlns='http://www.w3.org/2000/svg'%3e%3cellipse%20cx='17'%20cy='17'%20rx='17'%20ry='17'%20fill='%23596782'/%3e%3cpath%20d='M15.2515%2020.7951V20.626C15.2632%2019.5219%2015.3719%2018.6435%2015.5774%2017.9905C15.7888%2017.3376%2016.0883%2016.8093%2016.4759%2016.4057C16.8635%2016.0021%2017.3303%2015.6341%2017.8765%2015.3017C18.2288%2015.0761%2018.5459%2014.8239%2018.8278%2014.5449C19.1097%2014.2659%2019.3328%2013.9454%2019.4973%2013.5833C19.6617%2013.2212%2019.7439%2012.8206%2019.7439%2012.3813C19.7439%2011.8531%2019.6206%2011.396%2019.374%2011.0102C19.1273%2010.6244%2018.7985%2010.3276%2018.3874%2010.1199C17.9822%209.90618%2017.53%209.79934%2017.0308%209.79934C16.5787%209.79934%2016.147%209.89431%2015.736%2010.0843C15.3249%2010.2742%2014.9843%2010.571%2014.7142%2010.9746C14.444%2011.3723%2014.2884%2011.8857%2014.2473%2012.5149H11.5695C11.6106%2011.4465%2011.8778%2010.5443%2012.371%209.80824C12.8643%209.06629%2013.5162%208.50537%2014.3266%208.12549C15.1428%207.7456%2016.0443%207.55566%2017.0308%207.55566C18.1114%207.55566%2019.0568%207.76044%2019.8672%208.17C20.6776%208.57363%2021.306%209.14048%2021.7523%209.87057C22.2045%2010.5947%2022.4306%2011.4405%2022.4306%2012.4081C22.4306%2013.0729%2022.3278%2013.6724%2022.1223%2014.2066C21.9167%2014.7348%2021.6231%2015.2067%2021.2414%2015.6222C20.8656%2016.0377%2020.4134%2016.4057%2019.8849%2016.7262C19.3857%2017.0408%2018.9805%2017.3673%2018.6693%2017.7056C18.3639%2018.044%2018.1407%2018.4446%2017.9998%2018.9076C17.8589%2019.3706%2017.7825%2019.9434%2017.7708%2020.626V20.7951H15.2515ZM16.5816%2026.2084C16.1001%2026.2084%2015.6861%2026.0363%2015.3396%2025.692C14.9931%2025.3418%2014.8199%2024.9204%2014.8199%2024.4277C14.8199%2023.941%2014.9931%2023.5255%2015.3396%2023.1813C15.6861%2022.8311%2016.1001%2022.656%2016.5816%2022.656C17.0573%2022.656%2017.4683%2022.8311%2017.8148%2023.1813C18.1672%2023.5255%2018.3433%2023.941%2018.3433%2024.4277C18.3433%2024.7542%2018.2611%2025.054%2018.0967%2025.327C17.9381%2025.5941%2017.7267%2025.8078%2017.4625%2025.9681C17.1982%2026.1283%2016.9046%2026.2084%2016.5816%2026.2084Z'%20fill='%2390A2C0'/%3e%3c/svg%3e",Ir=m.div`
  ${d.flex({direction:"row",justify:"normal"})};
  width: 100%;
  height: 60px;
  padding: 12px 14px;
  background-color: ${a("neutral","_7")};
  border-radius: 18px;
  cursor: pointer;
  transition: 0.2s;

  &:hover {
    background-color: ${a("neutral","b")};
  }

  & + & {
    margin-top: 12px;
  }

  .logo-wrapper {
    position: relative;
    display: flex;
    flex-shrink: 0;
    width: 34px;
    height: 34px;

    .logo {
      width: 100%;
      height: 100%;
      border-radius: 8px;
    }

    .badge {
      position: absolute;
      width: 12px;
      height: 12px;
      right: 0;
      bottom: 0;
    }
  }

  .title-wrapper {
    ${d.flex({align:"flex-start"})};
    width: 100%;
    margin: 0 12px;

    .title {
      display: inline-flex;
      align-items: center;
      ${h.body3Bold};
      line-height: 18px;

      &.extend {
        ${h.body2Bold};
      }

      .info {
        max-width: 110px;
        text-overflow: ellipsis;
        white-space: nowrap;
        overflow: hidden;
      }

      .extra-info {
        ${h.body4Bold};
        margin-left: 5px;
      }
    }

    .description {
      ${h.body3Reg};
      color: ${a("neutral","a")};
      line-height: 18px;
    }
  }

  .value-wrapper {
    ${d.flex({align:"flex-end"})};
    flex-wrap: wrap;
    width: fit-content;
    max-width: 150px;
    flex-shrink: 0;
    word-break: break-all;

    .value.more {
      ${h.body2Reg};
    }

    &.active div * {
      color: ${a("green","_5")};
    }

    &.blur div * {
      color: ${a("neutral","a")};
    }
  }
`,He=t=>{const{hash:r,logo:n,type:i,status:o,title:l,extraInfo:p,description:g,amount:c,valueType:u,queryGRC721TokenUri:w,onClickItem:y}=t,[j,C]=s.useState(!1),[x,$]=s.useState(!1),k=i==="TRANSFER_GRC721"&&w!==void 0?w(n||"","0"):null,q=s.useMemo(()=>j?`${Q}`:i==="TRANSFER_GRC721"&&k?x?k?.data||`${Q}`:`${Q}`:i==="ADD_PACKAGE"?`${jt}`:i==="CONTRACT_CALL"?`${we}`:i==="MULTI_CONTRACT_CALL"?`${we}`:n?`${n}`:`${Q}`,[x,j,i,n,k]),L=()=>{C(!0)},M=()=>{$(!0)},A=s.useMemo(()=>u==="ACTIVE"?"active":u==="BLUR"?"blur":"",[u]),v=s.useMemo(()=>u==="ACTIVE",[u]);return e.jsxs(Ir,{onClick:()=>y(r),children:[e.jsxs("div",{className:"logo-wrapper",children:[e.jsx("img",{className:"logo",src:q,alt:"logo image",onLoad:M,onError:L}),e.jsx("img",{className:"badge",src:o==="SUCCESS"?ut:mt,alt:"status badge"})]}),e.jsxs("div",{className:"title-wrapper",children:[e.jsxs("span",{className:g?"title":"title extend",children:[e.jsx("span",{className:"info",children:l}),p&&e.jsx("span",{className:"extra-info",children:p})]}),g&&e.jsx("span",{className:"description",children:g})]}),e.jsx("div",{className:`value-wrapper ${A}`,children:i==="MULTI_CONTRACT_CALL"?e.jsx("span",{className:"value more",children:"More"}):i==="TRANSFER_GRC721"?e.jsx("span",{className:"value grc721",children:`${c.denom} #${c.value}`}):e.jsx(Z,{value:c.value,denom:c.denom,fontStyleKey:"body2Reg",minimumFontSize:"11px",orientation:"HORIZONTAL",withSign:v})})]})};He.__docgenInfo={description:"",methods:[],displayName:"TransactionHistoryListItem",props:{hash:{required:!0,tsType:{name:"string"},description:""},logo:{required:!1,tsType:{name:"string"},description:""},type:{required:!0,tsType:{name:"union",raw:"'TRANSFER' | 'TRANSFER_GRC721' | 'ADD_PACKAGE' | 'CONTRACT_CALL' | 'MULTI_CONTRACT_CALL'",elements:[{name:"literal",value:"'TRANSFER'"},{name:"literal",value:"'TRANSFER_GRC721'"},{name:"literal",value:"'ADD_PACKAGE'"},{name:"literal",value:"'CONTRACT_CALL'"},{name:"literal",value:"'MULTI_CONTRACT_CALL'"}]},description:""},status:{required:!0,tsType:{name:"union",raw:"'SUCCESS' | 'FAIL'",elements:[{name:"literal",value:"'SUCCESS'"},{name:"literal",value:"'FAIL'"}]},description:""},title:{required:!0,tsType:{name:"string"},description:""},description:{required:!1,tsType:{name:"string"},description:""},extraInfo:{required:!1,tsType:{name:"string"},description:""},amount:{required:!0,tsType:{name:"signature",type:"object",raw:`{
  value: string
  denom: string
}`,signature:{properties:[{key:"value",value:{name:"string",required:!0}},{key:"denom",value:{name:"string",required:!0}}]}},description:""},valueType:{required:!0,tsType:{name:"union",raw:"'DEFAULT' | 'ACTIVE' | 'BLUR'",elements:[{name:"literal",value:"'DEFAULT'"},{name:"literal",value:"'ACTIVE'"},{name:"literal",value:"'BLUR'"}]},description:""},queryGRC721TokenUri:{required:!1,tsType:{name:"signature",type:"function",raw:`(
  packagePath: string,
  tokenId: string,
  options?: UseQueryOptions<string | null, Error>,
) => UseQueryResult<string | null>`,signature:{arguments:[{type:{name:"string"},name:"packagePath"},{type:{name:"string"},name:"tokenId"},{type:{name:"UseQueryOptions",elements:[{name:"union",raw:"string | null",elements:[{name:"string"},{name:"null"}]},{name:"Error"}],raw:"UseQueryOptions<string | null, Error>"},name:"options"}],return:{name:"UseQueryResult",elements:[{name:"union",raw:"string | null",elements:[{name:"string"},{name:"null"}]}],raw:"UseQueryResult<string | null>"}}},description:""},onClickItem:{required:!0,tsType:{name:"signature",type:"function",raw:"(hash: string) => void",signature:{arguments:[{type:{name:"string"},name:"hash"}],return:{name:"void"}}},description:""}}};const Mr=m.div`
  ${d.flex({align:"normal",justify:"normal"})};
  width: 100%;
  height: auto;

  & > .title {
    ${h.body1Reg};
    color: ${a("neutral","a")};
  }

  & > .list-wrapper {
    margin-top: 12px;
  }
`,ze=({title:t,transactions:r,queryGRC721TokenUri:n,onClickItem:i})=>e.jsxs(Mr,{children:[e.jsx("span",{className:"title",children:t}),e.jsx("div",{className:"list-wrapper",children:r.map(o=>e.jsx(He,{...o,queryGRC721TokenUri:n,onClickItem:i},o.hash))})]});ze.__docgenInfo={description:"",methods:[],displayName:"TransactionHistoryList",props:{title:{required:!0,tsType:{name:"string"},description:""},transactions:{required:!0,tsType:{name:"Array",elements:[{name:"TransactionInfo"}],raw:"TransactionInfo[]"},description:""},queryGRC721TokenUri:{required:!1,tsType:{name:"signature",type:"function",raw:`(
  packagePath: string,
  tokenId: string,
  options?: UseQueryOptions<string | null, Error>,
) => UseQueryResult<string | null>`,signature:{arguments:[{type:{name:"string"},name:"packagePath"},{type:{name:"string"},name:"tokenId"},{type:{name:"UseQueryOptions",elements:[{name:"union",raw:"string | null",elements:[{name:"string"},{name:"null"}]},{name:"Error"}],raw:"UseQueryOptions<string | null, Error>"},name:"options"}],return:{name:"UseQueryResult",elements:[{name:"union",raw:"string | null",elements:[{name:"string"},{name:"null"}]}],raw:"UseQueryResult<string | null>"}}},description:""},onClickItem:{required:!0,tsType:{name:"signature",type:"function",raw:"(hash: string) => void",signature:{arguments:[{type:{name:"string"},name:"hash"}],return:{name:"void"}}},description:""}}};const Rr=m.div`
  ${d.flex({align:"flex-start",justify:"flex-start"})};
  position: relative;
  width: 100%;
  z-index: 1;
`,Sr=m.div`
  ${d.flex({align:"flex-end"})};
  margin-left: auto;
`,Er=m.div`
  ${d.flex({justify:"flex-start"})}
  width: 100%;
  gap: 12px;
  padding-top: 12px;
`,Br=m(P)`
  ${d.flex({direction:"row",justify:"flex-start"})}
  width: 100%;
  height: 60px;
`,Qe=()=>e.jsxs(Rr,{children:[e.jsx(G,{width:"91px",height:"14px",radius:"24px"}),e.jsx(Er,{children:Array.from({length:5},(t,r)=>e.jsxs(Br,{children:[e.jsx(lt,{width:"34px",height:"34px",margin:"0px 15px 0px 0px"}),e.jsx(G,{width:"91px",height:"10px",radius:"24px"}),e.jsxs(Sr,{children:[e.jsx(G,{width:"100px",height:"10px",radius:"24px"}),e.jsx(G,{width:"58px",height:"10px",radius:"24px",margin:"10px 0px 0px"})]})]},r))})]});Qe.__docgenInfo={description:"",methods:[],displayName:"LoadingHistory"};const Dr=m.div`
  ${d.flex({align:"normal",justify:"normal"})};
  width: 100%;
  height: auto;

  & > div + div {
    margin-top: 24px;
  }
`,Fr=m.div`
  ${d.flex({align:"normal",justify:"normal"})};
  width: 100%;
  height: auto;
  padding-top: 140px;

  text-align: center;
`,Or=({status:t,transactionInfoLists:r,queryGRC721TokenUri:n,onClickItem:i})=>{const o=Ne();return r.length===0?t==="loading"?e.jsx(Qe,{}):e.jsx(Fr,{children:e.jsx(b,{className:"desc",type:"body1Reg",color:o.neutral.a,textAlign:"center",children:"No transaction to display"})}):e.jsx(Dr,{children:r.map((l,p)=>e.jsx(ze,{...l,queryGRC721TokenUri:n,onClickItem:i},p))})};Or.__docgenInfo={description:"",methods:[],displayName:"TransactionHistory",props:{status:{required:!0,tsType:{name:"union",raw:"'error' | 'loading' | 'success'",elements:[{name:"literal",value:"'error'"},{name:"literal",value:"'loading'"},{name:"literal",value:"'success'"}]},description:""},transactionInfoLists:{required:!0,tsType:{name:"Array",elements:[{name:"signature",type:"object",raw:`{
  title: string
  transactions: TransactionInfo[]
}`,signature:{properties:[{key:"title",value:{name:"string",required:!0}},{key:"transactions",value:{name:"Array",elements:[{name:"TransactionInfo"}],raw:"TransactionInfo[]",required:!0}}]}}],raw:`{
  title: string
  transactions: TransactionInfo[]
}[]`},description:""},queryGRC721TokenUri:{required:!1,tsType:{name:"signature",type:"function",raw:`(
  packagePath: string,
  tokenId: string,
  options?: UseQueryOptions<string | null, Error>,
) => UseQueryResult<string | null>`,signature:{arguments:[{type:{name:"string"},name:"packagePath"},{type:{name:"string"},name:"tokenId"},{type:{name:"UseQueryOptions",elements:[{name:"union",raw:"string | null",elements:[{name:"string"},{name:"null"}]},{name:"Error"}],raw:"UseQueryOptions<string | null, Error>"},name:"options"}],return:{name:"UseQueryResult",elements:[{name:"union",raw:"string | null",elements:[{name:"string"},{name:"null"}]}],raw:"UseQueryResult<string | null>"}}},description:""},onClickItem:{required:!0,tsType:{name:"signature",type:"function",raw:"(hash: string) => void",signature:{arguments:[{type:{name:"string"},name:"hash"}],return:{name:"void"}}},description:""}}};m(D)`
  row-gap: 10px;
`;export{Ct as A,ar as B,we as C,Ae as D,wr as E,kn as G,Oe as I,Tr as L,bn as M,ce as N,Ge as S,He as T,Q as U,rr as a,jt as b,ze as c,Or as d,I as e,Ue as f,ue as g,me as h,te as i,ur as j,mr as k,qr as l,jn as m,Pt as n,Fe as o,tr as p,je as q,pe as r,Le as s,qe as t,F as u,Vt as v,hr as w};
