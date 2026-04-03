import{m as s,j as r}from"./global-style-Be4sOX77.js";import{f as a,g as e,d as m,r as o}from"./theme-D2qI5cuM.js";const h="data:image/svg+xml,%3csvg%20width='14'%20height='14'%20viewBox='0%200%2014%2014'%20fill='none'%20xmlns='http://www.w3.org/2000/svg'%3e%3cg%20clip-path='url(%23clip0_9116_7794)'%3e%3cpath%20d='M7%207.83594V9.5026'%20stroke='%23FB923C'%20stroke-width='2'%20stroke-linecap='round'%20stroke-linejoin='round'%20/%3e%3cpath%20d='M7.41732%204.5026C7.41732%204.73272%207.23077%204.91927%207.00065%204.91927C6.77053%204.91927%206.58398%204.73272%206.58398%204.5026C6.58398%204.27249%206.77053%204.08594%207.00065%204.08594C7.23077%204.08594%207.41732%204.27249%207.41732%204.5026Z'%20stroke='%23FB923C'%20/%3e%3cpath%20d='M13.0423%207.0026C13.0423%2010.3393%2010.3374%2013.0443%207.00065%2013.0443C3.66393%2013.0443%200.958984%2010.3393%200.958984%207.0026C0.958984%203.66588%203.66393%200.960938%207.00065%200.960938C10.3374%200.960938%2013.0423%203.66588%2013.0423%207.0026Z'%20stroke='%23FB923C'%20stroke-width='1.5'%20stroke-linecap='round'%20stroke-linejoin='round'%20/%3e%3c/g%3e%3cdefs%3e%3cclipPath%20id='clip0_9116_7794'%3e%3crect%20width='14'%20height='14'%20fill='white'%20/%3e%3c/clipPath%3e%3c/defs%3e%3c/svg%3e",x=m.div`
  ${s.flex({align:"normal",justify:"normal"})};
  width: 100%;
  height: auto;
  gap: 12px;

  .memo-input {
    ${s.flex({direction:"row",justify:"normal"})};
    width: 100%;
    height: auto;
    padding: 12px 16px;
    background-color: ${e("neutral","_9")};
    border: 1px solid ${e("neutral","_7")};
    border-radius: 30px;
    resize: none;

    ${a.body2Reg};

    &.error {
      border-color: ${e("red","_5")};
    }
  }

  .warning-wrapper {
    ${s.flex({direction:"row",justify:"normal",align:"flex-start"})};
    width: 100%;
    border-radius: 8px;
    border: 1px solid ${e("red","_8")}0d;
    background-color: ${e("red","_8")}1a;
    padding: 12px 20px;
    gap: 8px;

    .icon-warning {
      width: 14px;
      padding: 4px 0;
    }

    .warning-text {
      width: 100%;
      ${a.body2Reg};
      color: ${e("red","_8")};
    }
  }

  .error-message {
    position: relative;
    margin-top: -10px;
    padding: 0 16px;
    ${a.captionReg};
    font-size: 13px;
    color: ${e("red","_5")};
  }
`,w="A memo is required when sending tokens to a centralized exchange.",f=({memo:c,memoError:n,onChangeMemo:l})=>{const t=o.useRef(null),d=o.useMemo(()=>!!n,[n]),g=o.useMemo(()=>n?n.message:"",[n]),p=()=>{t.current&&(t.current.style.height="auto",t.current.style.height=t.current.scrollHeight+"px")},u=i=>{l(i),p()};return o.useEffect(()=>{p()},[]),r.jsxs(x,{children:[r.jsx("textarea",{ref:t,className:d?"memo-input error":"memo-input",value:c,onChange:i=>u(i.target.value),rows:1,placeholder:"Memo (Optional)"}),d&&r.jsx("span",{className:"error-message",children:g}),r.jsxs("div",{className:"warning-wrapper",children:[r.jsx("img",{className:"icon-warning",src:h,alt:"icon"}),r.jsx("span",{className:"warning-text",children:w})]})]})};f.__docgenInfo={description:"",methods:[],displayName:"MemoInput",props:{memo:{required:!0,tsType:{name:"string"},description:""},memoError:{required:!1,tsType:{name:"union",raw:"BaseError | null",elements:[{name:"BaseError"},{name:"null"}]},description:""},onChangeMemo:{required:!0,tsType:{name:"signature",type:"function",raw:"(memo: string) => void",signature:{arguments:[{type:{name:"string"},name:"memo"}],return:{name:"void"}}},description:""}}};export{f as M};
