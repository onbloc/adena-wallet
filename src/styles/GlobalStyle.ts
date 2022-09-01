import { createGlobalStyle } from 'styled-components';

export const GlobalStyle = createGlobalStyle`
  html, body {
    width: 360px;
    height: 540px;
    padding: 0;
    margin: 0;
    font-family: "Poppins", sans-serif;
    color: #ffffff;
    position: relative;
    background-color: #212128;
  };

  #popup {
    width: 100%;
    height: 100%;
    overflow: hidden;
    position: relative;
  };

  main {
    width: 100%;
    height: 492px;
    padding: 0px 20px 24px;
  };

  section {position: relative;}

  * {
    box-sizing: border-box;
    font: inherit;
  };

  a {
    text-decoration: none;
  };

  button {
    background: none;
    padding: 0;
    border: none;
    cursor: pointer;
    &:disabled {
      cursor: default;
    };
  };

  input {
    background: none; border: none; outline: none;
    &[type="password"]{
      letter-spacing: 7px;
      ::placeholder {
        letter-spacing: normal;
      }
    };
  };

  input[type="number"]::-webkit-inner-spin-button,
  input[type="number"]::-webkit-outer-spin-button {
    -webkit-appearance: none;
    margin: 0;
  };

  ::-webkit-scrollbar {
    width: 2px;
  };

  ::-webkit-scrollbar-track {
    background-color: transparent;
  };

  ::-webkit-scrollbar-thumb {
    background-color: rgba(255, 255, 255, 0.7);
    border-radius: 10px;
  };

  html, body, div, span, h1, h2, h3, h4, h5, h6, p, a, em, img, small, b, u, i, ul, li, dl, dd, dt, form, label, footer, header, nav, section, input, textarea {
    margin: 0;
    padding: 0;
    border: 0;
    outline: none;
    list-style: none;
  };

`;
