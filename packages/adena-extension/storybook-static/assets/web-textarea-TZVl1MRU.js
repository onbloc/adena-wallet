import{i as e}from"./_polyfill-node.global-CL4hvcq6.js";import{_ as t,g as n,i as r,o as i,r as a,v as o}from"./iframe-DekVl-_p.js";var s,c=e((()=>{r(),t(),s=n.textarea`
  ${i.body5};
  width: ${({width:e})=>e??`auto`};
  color: ${a(`webNeutral`,`_100`)};
  border-radius: 12px;
  border: 1px solid;
  padding: 16px;
  border-color: ${({theme:e})=>e.webNeutral._800};
  background-color: ${({theme:e})=>e.webInput._100};
  outline: none;
  resize: none;

  &:placeholder-shown {
    background-color: ${({theme:e})=>e.webNeutral._900};
  }

  ::placeholder {
    color: ${a(`webNeutral`,`_700`)};
  }

  &:focus-visible {
    box-shadow:
      0px 0px 0px 3px rgba(255, 255, 255, 0.04),
      0px 1px 3px 0px rgba(0, 0, 0, 0.1),
      0px 1px 2px 0px rgba(0, 0, 0, 0.06);
    background-color: ${({error:e,theme:t})=>e?t.webError._300:t.webInput._100};
  }

  &:focus {
    box-shadow:
      0px 0px 0px 3px rgba(255, 255, 255, 0.04),
      0px 1px 3px 0px rgba(0, 0, 0, 0.1),
      0px 1px 2px 0px rgba(0, 0, 0, 0.06);
    background-color: ${({error:e,theme:t})=>e?t.webError._300:t.webInput._100};
  }

  ${({theme:e,error:t})=>t?o`
          border-color: ${e.webError._200};
          background-color: ${e.webError._300};
          box-shadow:
            0px 0px 0px 3px rgba(235, 84, 94, 0.12),
            0px 1px 3px 0px rgba(0, 0, 0, 0.1),
            0px 1px 2px 0px rgba(0, 0, 0, 0.06);
        `:``}
`}));export{c as n,s as t};