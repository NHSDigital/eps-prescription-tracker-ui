import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "@/App";
import "@/styles/main.scss";
import { ENV_CONFIG } from "@/constants/environment";

const basePath = ENV_CONFIG.BASE_PATH || "site";

document.body.className = document.body.className.replace('no-js', 'js-enabled');

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter basename={basePath}>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
