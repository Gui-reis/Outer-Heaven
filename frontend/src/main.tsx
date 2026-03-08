import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";

/**
 * Fluxo [1]: ponto de entrada da aplicação.
 * - O Vite chama este arquivo primeiro para montar o React no elemento #root do index.html.
 * - Envolve a aplicação com BrowserRouter para habilitar rotas e com StrictMode para avisos de boas práticas.
 * - Quem dispara: runtime do ReactDOM no carregamento inicial da página.
 */
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
