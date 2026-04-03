import{c as e,i as t}from"./_polyfill-node.global-CL4hvcq6.js";import{_ as n,b as r,g as i,i as a,o,rt as s,t as c}from"./iframe-DekVl-_p.js";import{t as l}from"./atoms-DPNcwsZr.js";import{n as u,r as d,t as f}from"./base-D2xGt4mF.js";import{t as p}from"./web-img-BKM2YUA3.js";import{t as m}from"./web-text-BdpTg-VM.js";import{n as h,t as g}from"./web-seed-input-item-DBnUmciM.js";import{n as _,t as v}from"./web-textarea-TZVl1MRU.js";import{t as y}from"./lodash-Cj8hxz_R.js";var b=t((()=>{}));function x(e,t){let n=S.default.fill(Array(t),``);return[...e].concat(n.slice(e.length)).slice(0,t)}var S,C=t((()=>{S=e(y())})),w,T,E,D,O,k,A,j,M,N=t((()=>{b(),h(),_(),a(),w=e(y()),T=e(s()),n(),l(),C(),E=c(),D=i(d)`
  width: 100%;
  row-gap: 16px;
`,O=i(d)`
  width: 100%;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
`,k=i(u)`
  align-self: center;
  padding: 4px;
  column-gap: 4px;
  justify-content: center;
  border-radius: 40px;
  border: 1px solid rgba(255, 255, 255, 0.04);
  background: rgba(0, 0, 0, 0.2);
`,A=i(f)`
  padding: 8px 12px;
  border-radius: 40px;
  background: ${({selected:e})=>e?`rgba(0, 89, 255, 0.24)`:`transparent`};
`,j=i(v)`
  ${o.body5};
  width: 100%;
  height: 80px;
`,M=({errorMessage:e,onChange:t})=>{let n=r(),[i,a]=(0,T.useState)(`12seeds`),[o,s]=(0,T.useState)([]),[c,l]=(0,T.useState)(``),f=(0,T.useCallback)((e,t)=>x(t,e===`12seeds`?12:24),[]),h=(0,T.useCallback)((e,n)=>{let r=f(i,o);r[e]=n,s(r),t({type:i,value:r.join(` `)})},[i,o]),_=(0,T.useCallback)(e=>{let n=f(i,e.split(` `));s(n),t({type:i,value:n.join(` `)})},[i]),v=(0,T.useCallback)(({title:e,_type:r})=>{let s=i===r;return(0,E.jsx)(A,{onClick:()=>{a(r),t({type:r,value:r===`pKey`?c:f(r,o).join(` `)})},selected:s,children:(0,E.jsx)(m,{type:`title5`,color:s?n.webNeutral._100:n.webNeutral._500,children:e})})},[i,o,c]);return(0,E.jsxs)(D,{children:[(0,E.jsxs)(k,{children:[(0,E.jsx)(v,{_type:`12seeds`,title:`12 words`}),(0,E.jsx)(v,{_type:`24seeds`,title:`24 words`}),(0,E.jsx)(v,{_type:`pKey`,title:`Private Key`})]}),(0,E.jsxs)(d,{style:{rowGap:12},children:[i===`pKey`?(0,E.jsx)(j,{value:c,placeholder:`Private Key`,error:!!e,onChange:({target:{value:e}})=>{t({type:i,value:e}),l(e)}}):(0,E.jsx)(O,{children:w.default.times(i===`12seeds`?12:24,t=>(0,E.jsx)(g,{type:`password`,index:t+1,value:o[t]||``,error:!!e,onChange:e=>{t===0&&e.split(` `).length>1?_(e):h(t,e)}},`seeds-${t}`))}),!!e&&(0,E.jsxs)(u,{style:{columnGap:6,alignItems:`center`},children:[(0,E.jsx)(p,{src:`data:image/svg+xml,%3csvg%20width='20'%20height='20'%20viewBox='0%200%2020%2020'%20fill='none'%20xmlns='http://www.w3.org/2000/svg'%3e%3cg%20id='Error'%3e%3cpath%20id='Vector'%20d='M10.0003%201.66602C5.40033%201.66602%201.66699%205.39935%201.66699%209.99935C1.66699%2014.5993%205.40033%2018.3327%2010.0003%2018.3327C14.6003%2018.3327%2018.3337%2014.5993%2018.3337%209.99935C18.3337%205.39935%2014.6003%201.66602%2010.0003%201.66602ZM10.0003%2010.8327C9.54199%2010.8327%209.16699%2010.4577%209.16699%209.99935V6.66602C9.16699%206.20768%209.54199%205.83268%2010.0003%205.83268C10.4587%205.83268%2010.8337%206.20768%2010.8337%206.66602V9.99935C10.8337%2010.4577%2010.4587%2010.8327%2010.0003%2010.8327ZM10.8337%2014.166H9.16699V12.4993H10.8337V14.166Z'%20fill='%23EB545E'/%3e%3c/g%3e%3c/svg%3e`,size:20,color:n.webError._100}),(0,E.jsx)(m,{type:`body5`,color:n.webError._100,children:e})]})]})]})},M.__docgenInfo={description:``,methods:[],displayName:`WebSeedInput`,props:{onChange:{required:!0,tsType:{name:`signature`,type:`function`,raw:`(props: {
  type: ImportWalletType
  value: string
}) => void`,signature:{arguments:[{type:{name:`signature`,type:`object`,raw:`{
  type: ImportWalletType
  value: string
}`,signature:{properties:[{key:`type`,value:{name:`ImportWalletType`,required:!0}},{key:`value`,value:{name:`string`,required:!0}}]}},name:`props`}],return:{name:`void`}}},description:``},errorMessage:{required:!1,tsType:{name:`string`},description:``}}}}));export{N as n,M as t};