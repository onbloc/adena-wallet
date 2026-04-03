import{n as e,o as t}from"./chunk-zsgVPwQN.js";import{_ as n,c as r,g as i,i as a,n as o,r as s,rt as c,s as l,t as u}from"./iframe-BclzClxJ.js";var d,f=e((()=>{d=`data:image/svg+xml,%3csvg%20width='14'%20height='14'%20viewBox='0%200%2014%2014'%20fill='none'%20xmlns='http://www.w3.org/2000/svg'%3e%3cg%20clip-path='url(%23clip0_9116_7794)'%3e%3cpath%20d='M7%207.83594V9.5026'%20stroke='%23FB923C'%20stroke-width='2'%20stroke-linecap='round'%20stroke-linejoin='round'%20/%3e%3cpath%20d='M7.41732%204.5026C7.41732%204.73272%207.23077%204.91927%207.00065%204.91927C6.77053%204.91927%206.58398%204.73272%206.58398%204.5026C6.58398%204.27249%206.77053%204.08594%207.00065%204.08594C7.23077%204.08594%207.41732%204.27249%207.41732%204.5026Z'%20stroke='%23FB923C'%20/%3e%3cpath%20d='M13.0423%207.0026C13.0423%2010.3393%2010.3374%2013.0443%207.00065%2013.0443C3.66393%2013.0443%200.958984%2010.3393%200.958984%207.0026C0.958984%203.66588%203.66393%200.960938%207.00065%200.960938C10.3374%200.960938%2013.0423%203.66588%2013.0423%207.0026Z'%20stroke='%23FB923C'%20stroke-width='1.5'%20stroke-linecap='round'%20stroke-linejoin='round'%20/%3e%3c/g%3e%3cdefs%3e%3cclipPath%20id='clip0_9116_7794'%3e%3crect%20width='14'%20height='14'%20fill='white'%20/%3e%3c/clipPath%3e%3c/defs%3e%3c/svg%3e`})),p,m=e((()=>{l(),a(),n(),p=i.div`
  ${r.flex({align:`normal`,justify:`normal`})};
  width: 100%;
  height: auto;
  gap: 12px;

  .memo-input {
    ${r.flex({direction:`row`,justify:`normal`})};
    width: 100%;
    height: auto;
    padding: 12px 16px;
    background-color: ${s(`neutral`,`_9`)};
    border: 1px solid ${s(`neutral`,`_7`)};
    border-radius: 30px;
    resize: none;

    ${o.body2Reg};

    &.error {
      border-color: ${s(`red`,`_5`)};
    }
  }

  .warning-wrapper {
    ${r.flex({direction:`row`,justify:`normal`,align:`flex-start`})};
    width: 100%;
    border-radius: 8px;
    border: 1px solid ${s(`red`,`_8`)}0d;
    background-color: ${s(`red`,`_8`)}1a;
    padding: 12px 20px;
    gap: 8px;

    .icon-warning {
      width: 14px;
      padding: 4px 0;
    }

    .warning-text {
      width: 100%;
      ${o.body2Reg};
      color: ${s(`red`,`_8`)};
    }
  }

  .error-message {
    position: relative;
    margin-top: -10px;
    padding: 0 16px;
    ${o.captionReg};
    font-size: 13px;
    color: ${s(`red`,`_5`)};
  }
`})),h,g,_,v,y=e((()=>{f(),h=t(c()),m(),g=u(),_=`A memo is required when sending tokens to a centralized exchange.`,v=({memo:e,memoError:t,onChangeMemo:n})=>{let r=(0,h.useRef)(null),i=(0,h.useMemo)(()=>!!t,[t]),a=(0,h.useMemo)(()=>t?t.message:``,[t]),o=()=>{r.current&&(r.current.style.height=`auto`,r.current.style.height=r.current.scrollHeight+`px`)},s=e=>{n(e),o()};return(0,h.useEffect)(()=>{o()},[]),(0,g.jsxs)(p,{children:[(0,g.jsx)(`textarea`,{ref:r,className:i?`memo-input error`:`memo-input`,value:e,onChange:e=>s(e.target.value),rows:1,placeholder:`Memo (Optional)`}),i&&(0,g.jsx)(`span`,{className:`error-message`,children:a}),(0,g.jsxs)(`div`,{className:`warning-wrapper`,children:[(0,g.jsx)(`img`,{className:`icon-warning`,src:d,alt:`icon`}),(0,g.jsx)(`span`,{className:`warning-text`,children:_})]})]})},v.__docgenInfo={description:``,methods:[],displayName:`MemoInput`,props:{memo:{required:!0,tsType:{name:`string`},description:``},memoError:{required:!1,tsType:{name:`union`,raw:`BaseError | null`,elements:[{name:`BaseError`},{name:`null`}]},description:``},onChangeMemo:{required:!0,tsType:{name:`signature`,type:`function`,raw:`(memo: string) => void`,signature:{arguments:[{type:{name:`string`},name:`memo`}],return:{name:`void`}}},description:``}}}}));export{y as n,v as t};