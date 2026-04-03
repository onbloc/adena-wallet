import{j as r}from"./global-style-Be4sOX77.js";import{W as C}from"./index-DuHfkOKV.js";import{W as I}from"./index-CgTU6P2S.js";import{n as S,r as a,d,w as T}from"./theme-D2qI5cuM.js";import{_ as b}from"./lodash-BU2fF3dy.js";import"./index-Ct-w3XHB.js";import{V as y,R as h,P as k}from"./index-CLRA8FOO.js";import"./index-DrT1707K.js";import"./index-DjFTnIrN.js";import"./index-DacC881Y.js";import"./index-BxhAeZbh.js";import"./index-CulhM7-u.js";import"./index-CpLq81TF.js";import"./index-Bv2zqv-E.js";import"./index-g6zNktBg.js";import{W as E}from"./index-B3tmVslE.js";import"./index-C6Pb5J-W.js";import"./index-C0j4FPrl.js";import{W as x}from"./index-jlviZXHb.js";const K="data:image/svg+xml,%3csvg%20width='20'%20height='20'%20viewBox='0%200%2020%2020'%20fill='none'%20xmlns='http://www.w3.org/2000/svg'%3e%3cg%20id='Error'%3e%3cpath%20id='Vector'%20d='M10.0003%201.66602C5.40033%201.66602%201.66699%205.39935%201.66699%209.99935C1.66699%2014.5993%205.40033%2018.3327%2010.0003%2018.3327C14.6003%2018.3327%2018.3337%2014.5993%2018.3337%209.99935C18.3337%205.39935%2014.6003%201.66602%2010.0003%201.66602ZM10.0003%2010.8327C9.54199%2010.8327%209.16699%2010.4577%209.16699%209.99935V6.66602C9.16699%206.20768%209.54199%205.83268%2010.0003%205.83268C10.4587%205.83268%2010.8337%206.20768%2010.8337%206.66602V9.99935C10.8337%2010.4577%2010.4587%2010.8327%2010.0003%2010.8327ZM10.8337%2014.166H9.16699V12.4993H10.8337V14.166Z'%20fill='%23EB545E'/%3e%3c/g%3e%3c/svg%3e";function V(o,n){const p=b.fill(Array(n),"");return[...o].concat(p.slice(o.length)).slice(0,n)}const _=d(y)`
  width: 100%;
  row-gap: 16px;
`,P=d(y)`
  width: 100%;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
`,q=d(h)`
  align-self: center;
  padding: 4px;
  column-gap: 4px;
  justify-content: center;
  border-radius: 40px;
  border: 1px solid rgba(255, 255, 255, 0.04);
  background: rgba(0, 0, 0, 0.2);
`,B=d(k)`
  padding: 8px 12px;
  border-radius: 40px;
  background: ${({selected:o})=>o?"rgba(0, 89, 255, 0.24)":"transparent"};
`,M=d(I)`
  ${T.body5};
  width: 100%;
  height: 80px;
`,A=({errorMessage:o,onChange:n})=>{const p=S(),[s,w]=a.useState("12seeds"),[l,g]=a.useState([]),[c,j]=a.useState(""),m=a.useCallback((e,t)=>V(t,e==="12seeds"?12:24),[]),f=a.useCallback((e,t)=>{const i=m(s,l);i[e]=t,g(i),n({type:s,value:i.join(" ")})},[s,l]),W=a.useCallback(e=>{const t=m(s,e.split(" "));g(t),n({type:s,value:t.join(" ")})},[s]),u=a.useCallback(({title:e,_type:t})=>{const i=s===t;return r.jsx(B,{onClick:()=>{w(t);const v=t==="pKey"?c:m(t,l).join(" ");n({type:t,value:v})},selected:i,children:r.jsx(x,{type:"title5",color:i?p.webNeutral._100:p.webNeutral._500,children:e})})},[s,l,c]);return r.jsxs(_,{children:[r.jsxs(q,{children:[r.jsx(u,{_type:"12seeds",title:"12 words"}),r.jsx(u,{_type:"24seeds",title:"24 words"}),r.jsx(u,{_type:"pKey",title:"Private Key"})]}),r.jsxs(y,{style:{rowGap:12},children:[s==="pKey"?r.jsx(M,{value:c,placeholder:"Private Key",error:!!o,onChange:({target:{value:e}})=>{n({type:s,value:e}),j(e)}}):r.jsx(P,{children:b.times(s==="12seeds"?12:24,e=>r.jsx(C,{type:"password",index:e+1,value:l[e]||"",error:!!o,onChange:t=>{e===0&&t.split(" ").length>1?W(t):f(e,t)}},`seeds-${e}`))}),!!o&&r.jsxs(h,{style:{columnGap:6,alignItems:"center"},children:[r.jsx(E,{src:K,size:20,color:p.webError._100}),r.jsx(x,{type:"body5",color:p.webError._100,children:o})]})]})]})};A.__docgenInfo={description:"",methods:[],displayName:"WebSeedInput",props:{onChange:{required:!0,tsType:{name:"signature",type:"function",raw:`(props: {
  type: ImportWalletType
  value: string
}) => void`,signature:{arguments:[{type:{name:"signature",type:"object",raw:`{
  type: ImportWalletType
  value: string
}`,signature:{properties:[{key:"type",value:{name:"ImportWalletType",required:!0}},{key:"value",value:{name:"string",required:!0}}]}},name:"props"}],return:{name:"void"}}},description:""},errorMessage:{required:!1,tsType:{name:"string"},description:""}}};export{A as W};
