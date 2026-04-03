import{w as x,g as p,l as b,d as a}from"./theme-D2qI5cuM.js";const d=a.textarea`
  ${x.body5};
  width: ${({width:r})=>r??"auto"};
  color: ${p("webNeutral","_100")};
  border-radius: 12px;
  border: 1px solid;
  padding: 16px;
  border-color: ${({theme:r})=>r.webNeutral._800};
  background-color: ${({theme:r})=>r.webInput._100};
  outline: none;
  resize: none;

  &:placeholder-shown {
    background-color: ${({theme:r})=>r.webNeutral._900};
  }

  ::placeholder {
    color: ${p("webNeutral","_700")};
  }

  &:focus-visible {
    box-shadow:
      0px 0px 0px 3px rgba(255, 255, 255, 0.04),
      0px 1px 3px 0px rgba(0, 0, 0, 0.1),
      0px 1px 2px 0px rgba(0, 0, 0, 0.06);
    background-color: ${({error:r,theme:o})=>r?o.webError._300:o.webInput._100};
  }

  &:focus {
    box-shadow:
      0px 0px 0px 3px rgba(255, 255, 255, 0.04),
      0px 1px 3px 0px rgba(0, 0, 0, 0.1),
      0px 1px 2px 0px rgba(0, 0, 0, 0.06);
    background-color: ${({error:r,theme:o})=>r?o.webError._300:o.webInput._100};
  }

  ${({theme:r,error:o})=>o?b`
          border-color: ${r.webError._200};
          background-color: ${r.webError._300};
          box-shadow:
            0px 0px 0px 3px rgba(235, 84, 94, 0.12),
            0px 1px 3px 0px rgba(0, 0, 0, 0.1),
            0px 1px 2px 0px rgba(0, 0, 0, 0.06);
        `:""}
`;export{d as W};
