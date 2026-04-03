import{n as e}from"./chunk-zsgVPwQN.js";import{_ as t,c as n,g as r,s as i,v as a}from"./iframe-BclzClxJ.js";var o=e((()=>{})),s,c=e((()=>{o(),i(),t(),s=r.main.withConfig({shouldForwardProp:e=>![`width`,`spacing`,`responsiveSpacing`].includes(e)})`
  ${n.flex({align:`flex-start`,justify:`flex-start`})}
  width: ${({width:e})=>e??`552px`};
  margin: 0 auto 0;
  row-gap: 24px;

  ${({spacing:e})=>e?a`
          height: calc(100vh - 80px);
          padding-top: ${`${e-80}px`};
          justify-content: flex-start;
        `:a`
          height: 100vh;
          margin-top: -80px;
          justify-content: center;
        `}

  ${({responsiveSpacing:e})=>e?a`
          @media (max-height: 850px) {
            height: calc(100vh - 80px);
            padding-top: ${`${e-80}px`};
            justify-content: flex-start;
          }
        `:a``}
`}));export{c as n,o as r,s as t};