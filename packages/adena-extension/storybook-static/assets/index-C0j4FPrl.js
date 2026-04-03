import{m as i}from"./global-style-Be4sOX77.js";import{l as a,d as s}from"./theme-D2qI5cuM.js";const n=552,p=380,r=590,x=650,h=s.main.withConfig({shouldForwardProp:t=>!["width","spacing","responsiveSpacing"].includes(t)})`
  ${i.flex({align:"flex-start",justify:"flex-start"})}
  width: ${({width:t})=>t??`${n}px`};
  margin: 0 auto 0;
  row-gap: 24px;

  ${({spacing:t})=>t?a`
          height: calc(100vh - 80px);
          padding-top: ${`${t-80}px`};
          justify-content: flex-start;
        `:a`
          height: 100vh;
          margin-top: -80px;
          justify-content: center;
        `}

  ${({responsiveSpacing:t})=>t?a`
          @media (max-height: 850px) {
            height: calc(100vh - 80px);
            padding-top: ${`${t-80}px`};
            justify-content: flex-start;
          }
        `:a``}
`;export{r as P,h as W,x as a,p as b};
