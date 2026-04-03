import{c as e,i as t}from"./_polyfill-node.global-CL4hvcq6.js";import{_ as n,c as r,g as i,i as a,r as o,rt as s,s as c,t as l}from"./iframe-DekVl-_p.js";var u,d,f=t((()=>{s(),u=l(),d=()=>(0,u.jsx)(`svg`,{width:`16`,height:`16`,viewBox:`0 0 16 16`,fill:`none`,xmlns:`http://www.w3.org/2000/svg`,children:(0,u.jsx)(`path`,{d:`M6.0557 1.99978L12.5558 1.99978C12.9389 1.99978 13.3063 2.15197 13.5771 2.42285C13.848 2.69374 14.0002 3.06115 14.0002 3.44424L14.0002 9.9443M11.389 6.05549L11.389 12.5555C11.389 13.3533 10.7423 14 9.94451 14L3.44446 14C2.64671 14 2 13.3533 2 12.5555L2 6.05549C2 5.25774 2.64671 4.61103 3.44446 4.61103L9.94451 4.61103C10.7423 4.61103 11.389 5.25774 11.389 6.05549Z`,stroke:`white`,strokeWidth:`1.2`,strokeLinecap:`round`,strokeLinejoin:`round`})}),d.__docgenInfo={description:``,methods:[],displayName:`IconCopy`}})),p,m,h=t((()=>{s(),p=l(),m=()=>(0,p.jsx)(`svg`,{width:`16`,height:`16`,viewBox:`0 0 16 16`,fill:`none`,xmlns:`http://www.w3.org/2000/svg`,children:(0,p.jsx)(`path`,{d:`M3 7.5L6.33333 12L13 3`,stroke:`white`,strokeWidth:`1.2`,strokeLinecap:`round`,strokeLinejoin:`round`})}),m.__docgenInfo={description:``,methods:[],displayName:`iconCopyCheck`}})),g,_=t((()=>{c(),a(),n(),g=i.div`
  ${r.flex({align:`normal`,justify:`normal`})};
  width: ${({size:e})=>`${e}px`};
  height: ${({size:e})=>`${e}px`};
  cursor: pointer;

  svg {
    width: ${({size:e})=>`${e}px`};
    height: ${({size:e})=>`${e}px`};
    path {
      transition: 0.2s;
      stroke: ${({theme:e,checked:t})=>t?e.neutral._1:e.neutral.a};
    }
  }

  &:hover svg {
    path {
      stroke: ${o(`neutral`,`_1`)};
    }
  }
`})),v,y,b,x=t((()=>{f(),h(),v=e(s()),_(),y=l(),b=({className:e=``,copyText:t,style:n={},size:r=16,onClick:i})=>{let[a,o]=(0,v.useState)(!1);return(0,v.useEffect)(()=>{let e=setTimeout(()=>o(!1),2e3);return()=>{clearTimeout(e)}},[a]),(0,y.jsx)(g,{className:e,style:n,size:r,checked:a,onClick:(0,v.useCallback)(e=>{e.preventDefault(),e.stopPropagation(),o(!0),navigator.clipboard.writeText(t),i&&i()},[t,a,i]),children:a?(0,y.jsx)(m,{}):(0,y.jsx)(d,{})})},b.__docgenInfo={description:``,methods:[],displayName:`CopyIconButton`,props:{className:{required:!1,tsType:{name:`string`},description:``,defaultValue:{value:`''`,computed:!1}},copyText:{required:!0,tsType:{name:`string`},description:``},style:{required:!1,tsType:{name:`ReactCSSProperties`,raw:`React.CSSProperties`},description:``,defaultValue:{value:`{
}`,computed:!1}},size:{required:!1,tsType:{name:`number`},description:``,defaultValue:{value:`16`,computed:!1}},onClick:{required:!1,tsType:{name:`signature`,type:`function`,raw:`() => void`,signature:{arguments:[],return:{name:`void`}}},description:``}}}}));export{x as n,b as t};