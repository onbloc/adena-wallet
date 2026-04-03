import{w as b,g as p,d as x}from"./theme-D2qI5cuM.js";const e=x.input`
  ${b.body5};
  width: ${({width:o})=>o??"auto"};
  color: ${p("webNeutral","_0")};
  border-radius: 12px;
  border: 1px solid;
  padding: 12px 16px;
  border-color: ${({error:o,theme:r})=>o?r.webError._200:r.webNeutral._800};
  background-color: ${({error:o,theme:r})=>o?r.webError._300:r.webInput._100};

  &:placeholder-shown {
    background-color: ${({error:o,theme:r})=>o?r.webError._300:r.webNeutral._900};
  }

  ::placeholder {
    color: ${p("webNeutral","_700")};
  }

  &:focus {
    background-color: ${({error:o,theme:r})=>o?r.webError._300:r.webInput._100};
    box-shadow:
      0px 0px 0px 3px rgba(255, 255, 255, 0.04),
      0px 1px 3px 0px rgba(0, 0, 0, 0.1),
      0px 1px 2px 0px rgba(0, 0, 0, 0.06);
  }

  &:focus-visible {
    outline: none;
    box-shadow:
      0px 0px 0px 3px rgba(255, 255, 255, 0.04),
      0px 1px 3px 0px rgba(0, 0, 0, 0.1),
      0px 1px 2px 0px rgba(0, 0, 0, 0.06);
    background-color: ${({error:o,theme:r})=>o?r.webError._300:r.webInput._100};
  }
`;export{e as W};
