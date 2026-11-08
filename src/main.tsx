import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { FxLayer } from "./modules/fx";
import "./styles.css";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <FxLayer />
    <App />
  </React.StrictMode>,
);
