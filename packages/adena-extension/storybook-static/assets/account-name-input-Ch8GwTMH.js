import{c as e,i as t}from"./_polyfill-node.global-CL4hvcq6.js";import{_ as n,c as r,g as i,i as a,n as o,r as s,rt as c,s as l,t as u}from"./iframe-DekVl-_p.js";var d,f,p=t((()=>{c(),d=u(),f=()=>(0,d.jsxs)(`svg`,{xmlns:`http://www.w3.org/2000/svg`,width:`20`,height:`20`,viewBox:`0 0 20 20`,fill:`none`,children:[(0,d.jsx)(`path`,{d:`M14.3276 9.16395L8.24811 15.2413L7.36435 14.3575L7.45559 14.2662H6.25378C6.02437 14.2662 5.83667 14.0785 5.83667 13.8491V12.6472L5.74568 12.7384C5.62237 12.8636 5.53191 13.0148 5.48264 13.1816L4.88356 15.2205L6.92117 14.6208C7.06455 14.5713 7.23922 14.48 7.36435 14.3575L8.24811 15.2413C7.97699 15.5125 7.64069 15.7132 7.27311 15.8201L4.13614 16.7431C3.91664 16.8082 3.67914 16.7483 3.51725 16.5632C3.35535 16.425 3.29482 16.1877 3.35942 15.9661L4.28213 12.8297C4.39058 12.462 4.58949 12.1257 4.86088 11.8546L10.9385 5.77563L14.3276 9.16395Z`,fill:`#646486`}),(0,d.jsx)(`path`,{d:`M16.3168 4.95189C16.9686 5.60342 16.9686 6.6609 16.3168 7.3127L15.0551 8.57459L11.666 5.18575L12.9278 3.92387C13.5795 3.27212 14.638 3.27212 15.2897 3.92387L16.3168 4.95189Z`,fill:`#A3A3B5`})]}),f.__docgenInfo={description:``,methods:[],displayName:`IconEditSmall`}})),m,h=t((()=>{l(),a(),n(),m=i.div`
  ${r.flex({direction:`row`})};
  width: 150px;
  height: auto;
  padding: 12.5px 16px;
  background-color: ${s(`neutral`,`_9`)};
  border: 1px solid ${s(`neutral`,`_7`)};
  border-radius: 18px;
  transition: 0.2s;

  &.extended {
    width: 100%;
  }

  input {
    display: flex;
    flex-shrink: 1;
    width: 100%;
    overflow: hidden;
    ${o.body2Reg}

    &:not(:focus) {
      text-overflow: ellipsis;
    }
  }

  .icon-wrapper {
    display: flex;
    flex-shrink: 0;
    width: 20px;
    height: 20px;
    cursor: pointer;

    svg {
      width: 100%;
      height: 100%;

      * {
        transition: 0.2s;
      }
    }

    &:hover {
      svg * {
        fill: ${s(`neutral`,`_1`)};
      }
    }
  }
`})),g,_,v,y=t((()=>{p(),g=e(c()),h(),_=u(),v=({originName:e,name:t,setName:n,reset:r})=>{let[i,a]=(0,g.useState)(!1),o=(0,g.useMemo)(()=>i,[i]),s=(0,g.useCallback)(()=>{a(!0)},[a]),c=(0,g.useCallback)(()=>{a(!1)},[a]),l=(0,g.useCallback)(e=>{n(e.target.value)},[n]),u=(0,g.useCallback)(()=>{r(),a(!1)},[r]);return(0,_.jsxs)(m,{className:`${o&&`extended`}`,children:[(0,_.jsx)(`input`,{className:`name-input`,value:t,onChange:l,type:`text`,autoComplete:`off`,placeholder:e,onFocus:s,onBlur:c}),(0,_.jsx)(`div`,{className:`icon-wrapper`,onClick:u,children:(0,_.jsx)(f,{})})]})},v.__docgenInfo={description:``,methods:[],displayName:`AccountNameInput`,props:{originName:{required:!0,tsType:{name:`string`},description:``},name:{required:!0,tsType:{name:`string`},description:``},setName:{required:!0,tsType:{name:`signature`,type:`function`,raw:`(name: string) => void`,signature:{arguments:[{type:{name:`string`},name:`name`}],return:{name:`void`}}},description:``},reset:{required:!0,tsType:{name:`signature`,type:`function`,raw:`() => void`,signature:{arguments:[],return:{name:`void`}}},description:``}}}}));export{y as n,v as t};