import{n as e}from"./chunk-zsgVPwQN.js";import{_ as t,c as n,g as r,i,r as a,rt as o,s,t as c}from"./iframe-BclzClxJ.js";var l,u=e((()=>{s(),i(),t(),l=r.div`
  ${n.flex({align:`normal`,justify:`normal`})};
  flex-shrink: 0;
  width: 46px;
  height: 26px;
  padding: 3px;
  border-radius: 100px;
  background-color: ${a(`neutral`,`_5`)};
  transition: 0.2s;
  cursor: pointer;

  .circle {
    display: block;
    width: 20px;
    height: 20px;
    background-color: ${a(`neutral`,`_1`)};
    border-radius: 20px;
    transition: 0.2s;
  }

  &.activated {
    background-color: ${a(`primary`,`_7`)};

    .circle {
      margin-left: 20px;
    }
  }
`})),d,f,p=e((()=>{o(),u(),d=c(),f=({activated:e,onToggle:t})=>(0,d.jsx)(l,{className:e?`activated`:``,onClick:()=>t(!e),children:(0,d.jsx)(`div`,{className:`circle`})}),f.__docgenInfo={description:``,methods:[],displayName:`Toggle`,props:{activated:{required:!0,tsType:{name:`boolean`},description:``},onToggle:{required:!0,tsType:{name:`signature`,type:`function`,raw:`(activated: boolean) => void`,signature:{arguments:[{type:{name:`boolean`},name:`activated`}],return:{name:`void`}}},description:``}}}}));export{p as n,f as t};