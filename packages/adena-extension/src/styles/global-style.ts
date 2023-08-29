import { createGlobalStyle } from 'styled-components';
import theme from './theme';

export const GlobalStyle = createGlobalStyle`
  html, body {
    min-width: 360px;
    min-height: 540px;
    width: 100%;
    height: 100%;
    padding: 0;
    margin: 0;
    font-family: "Poppins", sans-serif;
    color: #ffffff;
    position: relative;
    background-color: #212128;
    overflow-y: auto;
    scroll-behavior: auto;
  };

  #popup {
    width: 100%;
    position: relative;
    display: flex;
    flex-direction: column;
  };

  main {
    position: relative;
    width: 100%;
    max-width: 360px;
    min-height: 492px;
    height: 100%;
    padding: 0px 20px 24px;
  };

  * {
    box-sizing: border-box;
    font: inherit;
    color: inherit;
  };

  a {
    text-decoration: none;
  };

  button {
    background: none;
    padding: 0;
    border: none;
    cursor: pointer;
    outline: none;
    &:disabled {
      cursor: default;
    };
  };

  input, textarea {
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
    width: 0;
  };

  ::-webkit-scrollbar-track {
    background-color: transparent;
  };

  ::-webkit-scrollbar-thumb {
    /* background-color: rgba(255, 255, 255, 0.7);
    border-radius: 10px; */
  };

  html, body, div, span, h1, h2, h3, h4, h5, h6, p, a, em, img, small, b, u, i, ul, li, dl, dd, dt, form, label, footer, header, nav, section, input, textarea {
    margin: 0;
    padding: 0;
    border: 0;
    outline: none;
    list-style: none;
  };

  h1 {
    ${theme.fonts.header1}
  }

  h2 {
    ${theme.fonts.header2}
  }

  h3 {
    ${theme.fonts.header3}
  }

  h4 {
    ${theme.fonts.header4}
  }

  h5 {
    ${theme.fonts.header5}
  }

  h6 {
    ${theme.fonts.header6}
  }

  h7 {
    ${theme.fonts.header7}
  }

`;
