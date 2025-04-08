import React from "react"
import ReactDOM from "react-dom/client"
import {BrowserRouter} from "react-router-dom"
import App from "@/App"
import "@/styles/main.scss"
import {ENV_CONFIG} from "@/constants/environment"
import {AwsRumProvider} from "./context/AwsRumProvider"
import ErrorBoundary from "./context/ErrorBoundary"

const basePath = ENV_CONFIG.BASE_PATH || "site"

document.body.className = document.body.className.replace("no-js", "js-enabled")

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AwsRumProvider>
      <ErrorBoundary>
        <BrowserRouter basename={basePath}>
          <App />
        </BrowserRouter>
      </ErrorBoundary>
    </AwsRumProvider>
  </React.StrictMode>
)
