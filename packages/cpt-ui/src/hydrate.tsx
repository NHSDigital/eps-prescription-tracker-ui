import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router";
import App from "@/App";

document.body.className = document.body.className.replace('no-js', 'js-enabled');

ReactDOM.hydrateRoot(
    document.getElementById("root")!,
    <React.StrictMode>
        <BrowserRouter basename="site">
            <App />
        </BrowserRouter>
    </React.StrictMode>
);