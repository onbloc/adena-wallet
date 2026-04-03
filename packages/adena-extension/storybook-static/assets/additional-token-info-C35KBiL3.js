import{n as e}from"./chunk-zsgVPwQN.js";import{_ as t,c as n,g as r,i,n as a,r as o,rt as s,s as c,t as l}from"./iframe-BclzClxJ.js";import{s as u,t as d}from"./atoms-kch4SvDy.js";var f,p,m,h=e((()=>{d(),c(),i(),t(),f=r.div`
  ${n.flex({align:`normal`,justify:`normal`})};
  width: 100%;
  height: auto;
`,p=r.div`
  ${n.flex({direction:`row`,justify:`space-between`})};
  width: 100%;
  height: 48px;
  padding: 13px 16px;
  background-color: ${o(`neutral`,`_9`)};
  border-radius: 30px;

  & + & {
    margin-top: 12px;
  }

  .title {
    display: inline-flex;
    flex-shrink: 0;
    color: ${o(`neutral`,`a`)};
    ${a.body2Reg};
  }

  .value {
    display: inline-block;
    max-width: 155px;
    color: ${o(`neutral`,`_1`)};
    ${a.body2Reg};
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
`,m=r(u)`
  width: 40px;
  height: 10px;
`})),g,_,v,y=e((()=>{s(),h(),g=l(),_=({title:e,value:t,isLoading:n})=>(0,g.jsxs)(p,{children:[(0,g.jsxs)(`span`,{className:`title`,children:[e,`:`]}),n?(0,g.jsx)(m,{}):(0,g.jsx)(`span`,{className:`value`,children:t})]}),v=({isLoading:e,symbol:t,path:n,decimals:r})=>(0,g.jsxs)(f,{children:[(0,g.jsx)(_,{title:`Token Symbol`,value:t,isLoading:e}),(0,g.jsx)(_,{title:`Token Path`,value:n,isLoading:e}),(0,g.jsx)(_,{title:`Token Decimals`,value:r,isLoading:e})]}),v.__docgenInfo={description:``,methods:[],displayName:`AdditionalTokenInfo`,props:{isLoading:{required:!0,tsType:{name:`boolean`},description:``},symbol:{required:!0,tsType:{name:`string`},description:``},path:{required:!0,tsType:{name:`string`},description:``},decimals:{required:!0,tsType:{name:`string`},description:``}}}}));export{y as n,v as t};