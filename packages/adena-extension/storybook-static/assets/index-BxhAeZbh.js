import{m as s,j as e}from"./global-style-Be4sOX77.js";import{f as a,g as d,d as p}from"./theme-D2qI5cuM.js";const o="data:image/svg+xml,%3csvg%20width='15'%20height='15'%20viewBox='0%200%2015%2015'%20fill='none'%20xmlns='http://www.w3.org/2000/svg'%3e%3ccircle%20cx='7'%20cy='7'%20r='6.25'%20stroke='%23777777'%20stroke-width='1.5'/%3e%3cline%20x1='12.0607'%20y1='12'%20x2='14'%20y2='13.9393'%20stroke='%23777777'%20stroke-width='1.5'%20stroke-linecap='round'/%3e%3c/svg%3e",c=p.div`
  ${s.flex({direction:"row",justify:"flex-start"})};
  width: 100%;
  height: 100%;
  max-height: 48px;
  padding: 12px 16px;
  border-radius: 30px;
  border: 1px solid ${d("neutral","_7")};

  .search-icon-wrapper {
    display: inline-flex;
    flex-shrink: 0;
    width: fit-content;
    align-items: center;
    padding: 0 5px;

    .search {
      width: 17px;
      height: 17px;
    }
  }

  .input-wrapper {
    display: inline-flex;
    flex-shrink: 1;
    width: 100%;
    height: 24px;
    padding: 0 5px;

    .search-input {
      width: 100%;
      ${a.body2Reg};
    }
  }

  .added-icon-wrapper {
    display: inline-flex;
    flex-shrink: 0;
    width: 24px;
    height: 24px;
    align-items: center;
    cursor: pointer;

    .added {
      width: 100%;
      height: 100%;
    }
  }
`,h=({keyword:r,onChangeKeyword:t,option:i})=>e.jsxs(c,{children:[e.jsx("div",{className:"search-icon-wrapper",children:e.jsx("img",{className:"search",src:o,alt:"search icon"})}),e.jsx("div",{className:"input-wrapper",children:e.jsx("input",{className:"search-input",value:r,onChange:n=>t(n.target.value),placeholder:"Search"})}),i&&e.jsx("div",{className:"added-icon-wrapper",onClick:()=>i.onClickButton(),children:i.button})]});h.__docgenInfo={description:"",methods:[],displayName:"SearchInput",props:{keyword:{required:!0,tsType:{name:"string"},description:""},onChangeKeyword:{required:!0,tsType:{name:"signature",type:"function",raw:"(keyword: string) => void",signature:{arguments:[{type:{name:"string"},name:"keyword"}],return:{name:"void"}}},description:""},option:{required:!1,tsType:{name:"AdditionalButtonOption"},description:""}}};export{h as S};
