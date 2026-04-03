import{n as e}from"./chunk-zsgVPwQN.js";import{_ as t,c as n,g as r,rt as i,s as a,t as o}from"./iframe-BclzClxJ.js";import{n as s,t as c}from"./network-list-item-DaIUGz8U.js";var l,u=e((()=>{a(),t(),l=r.div`
  ${n.flex({align:`normal`,justify:`normal`})};
  width: 100%;
  height: auto;

  & > div {
    margin-bottom: 12px;

    &:last-child {
      margin-bottom: 0;
    }
  }
`})),d,f,p=e((()=>{i(),s(),u(),d=o(),f=({currentNetworkId:e,networkMetainfos:t,changeNetwork:n,moveEditPage:r})=>(0,d.jsx)(l,{children:t.map((t,i)=>(0,d.jsx)(c,{selected:t.id===e,locked:t.default===!0,networkMetainfo:t,changeNetwork:n,moveEditPage:r},i))}),f.__docgenInfo={description:``,methods:[],displayName:`NetworkList`,props:{currentNetworkId:{required:!0,tsType:{name:`string`},description:``},networkMetainfos:{required:!0,tsType:{name:`Array`,elements:[{name:`NetworkMetainfo`}],raw:`NetworkMetainfo[]`},description:``},changeNetwork:{required:!0,tsType:{name:`signature`,type:`function`,raw:`(networkMetainfoId: string) => void`,signature:{arguments:[{type:{name:`string`},name:`networkMetainfoId`}],return:{name:`void`}}},description:``},moveEditPage:{required:!0,tsType:{name:`signature`,type:`function`,raw:`(networkMetainfoId: string) => void`,signature:{arguments:[{type:{name:`string`},name:`networkMetainfoId`}],return:{name:`void`}}},description:``}}}}));export{p as n,f as t};