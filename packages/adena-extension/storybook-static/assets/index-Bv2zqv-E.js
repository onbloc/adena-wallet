import{j as o}from"./global-style-Be4sOX77.js";import{d as r}from"./theme-D2qI5cuM.js";import{V as n}from"./index-CLRA8FOO.js";const s="data:image/svg+xml,%3csvg%20width='12'%20height='13'%20viewBox='0%200%2012%2013'%20fill='none'%20xmlns='http://www.w3.org/2000/svg'%3e%3cg%20id='icon/check/white/1616'%3e%3cpath%20id='Vector%2012'%20d='M2%206.5L4.66667%2010.5L10%202.5'%20stroke='white'%20stroke-width='1.5'%20stroke-linecap='round'%20stroke-linejoin='round'/%3e%3c/g%3e%3c/svg%3e",a=r(n)`
  cursor: ${({disabled:e})=>e?"not-allowed":"pointer"};
  opacity: ${({disabled:e})=>e?.5:1};
  outline: ${({checked:e})=>e?"none":"0.5px solid #6C717A"};
  width: 20px;
  height: 20px;
  background-color: ${({checked:e,theme:t})=>e?t.webPrimary._100:"transparent"};
  align-items: center;
  justify-content: center;
  border-radius: 4px;
`,c=({checked:e,onClick:t,disabled:i})=>o.jsx(a,{checked:e,onClick:t,disabled:i,children:e&&o.jsx("img",{src:s,width:16,height:16})});c.__docgenInfo={description:"",methods:[],displayName:"WebCheckBox",props:{checked:{required:!0,tsType:{name:"boolean"},description:""},onClick:{required:!1,tsType:{name:"signature",type:"function",raw:"() => void",signature:{arguments:[],return:{name:"void"}}},description:""},disabled:{required:!1,tsType:{name:"boolean"},description:""}}};export{c as W};
