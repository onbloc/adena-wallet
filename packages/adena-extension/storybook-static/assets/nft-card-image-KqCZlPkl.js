import{c as e,i as t}from"./_polyfill-node.global-CL4hvcq6.js";import{_ as n,c as r,g as i,i as a,r as o,rt as s,s as c,t as l}from"./iframe-DekVl-_p.js";import{l as u,s as d,t as f}from"./atoms-DPNcwsZr.js";import{r as p}from"./base-D2xGt4mF.js";import{n as m,t as h}from"./icon-empty-image-tRvbuY7U.js";var g,_,v=t((()=>{f(),c(),a(),n(),g=i(p)`
  width: 100%;
  height: 100%;
  background-color: ${o(`neutral`,`_7`)};
  align-items: center;
  justify-content: center;

  .empty-image {
    width: 31px;
    height: auto;
  }

  .nft-image {
    width: auto;
    height: auto;
    min-width: 100%;
    min-height: 100%;
    object-fit: cover;
  }
`,_=i(d)`
  ${r.flex({align:`flex-end`,justify:`space-between`})}
  width: 100%;
  flex: 1;
  height: 100%;
  padding: 10px;
`})),y,b,x,S=t((()=>{m(),f(),y=e(s()),v(),b=l(),x=({isFetched:e,image:t,hasBadge:n=!1})=>{let[r,i]=(0,y.useState)(!1);return e?!t||r?(0,b.jsx)(g,{className:`empty`,children:(0,b.jsx)(`img`,{className:`empty-image`,src:h,alt:`empty image`})}):(0,b.jsx)(g,{children:(0,b.jsx)(`img`,{className:`nft-image`,src:t||`data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%20width='31'%20height='26'%20viewBox='0%200%2031%2026'%20fill='none'%3e%3cpath%20fill-rule='evenodd'%20clip-rule='evenodd'%20d='M0%204C0%201.79086%201.79086%200%204%200L27%200C29.2091%200%2031%201.79086%2031%204V22C31%2024.2091%2029.2091%2026%2027%2026H4C1.79086%2026%200%2024.2091%200%2022L0%204Z'%20fill='%234C4C5A'%20/%3e%3cpath%20fill-rule='evenodd'%20clip-rule='evenodd'%20d='M3.9668%207.04492C3.9668%205.38807%205.30994%204.04492%206.9668%204.04492H24.0316C25.6885%204.04492%2027.0316%205.38807%2027.0316%207.04492V18.9538C27.0316%2020.6106%2025.6885%2021.9538%2024.0316%2021.9538H6.9668C5.30994%2021.9538%203.9668%2020.6106%203.9668%2018.9538L3.9668%207.04492Z'%20fill='%234C4C5A'%20/%3e%3cpath%20fill-rule='evenodd'%20clip-rule='evenodd'%20d='M26.0039%2017.6137L24.0672%2016.0738C22.5972%2014.905%2020.5107%2014.9179%2019.0526%2016.1047L17.9177%2017.0285C17.5277%2017.3459%2016.963%2017.3248%2016.5985%2016.9792L13.5001%2014.0414C11.8458%2012.4728%209.21518%2012.6045%207.72208%2014.3306L4.94508%2017.5412L4.29986%2018.3413L4.23993%2020.6175C4.22511%2021.1803%204.67759%2021.6438%205.24058%2021.6426L25.9456%2021.5985C26.4903%2021.5974%2026.9344%2021.1604%2026.9444%2020.6157L26.9872%2018.28L26.0039%2017.6137Z'%20fill='%23212128'%20/%3e%3cellipse%20cx='2.29734'%20cy='2.15973'%20rx='2.29734'%20ry='2.15973'%20transform='matrix(-0.999993%20-0.00373596%20-0.00422724%200.999991%2024.6328%206.42188)'%20fill='%23212128'%20/%3e%3c/svg%3e`,onError:()=>{i(!0)},alt:`nft image`})}):(0,b.jsx)(_,{children:n&&(0,b.jsx)(u,{width:`132px`,height:`20px`,radius:`10px`,margin:`0 auto`})})},x.__docgenInfo={description:``,methods:[],displayName:`NFTCardImage`,props:{isFetched:{required:!0,tsType:{name:`boolean`},description:``},image:{required:!0,tsType:{name:`union`,raw:`string | null | undefined`,elements:[{name:`string`},{name:`null`},{name:`undefined`}]},description:``},hasBadge:{required:!1,tsType:{name:`boolean`},description:``,defaultValue:{value:`false`,computed:!1}}}}}));export{S as n,x as t};