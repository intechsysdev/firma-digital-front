import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { ProveedorSesion } from "./sesion/SesionContexto";
import { ProveedorTema } from "./tema/TemaContexto";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ProveedorTema>
      <BrowserRouter>
        <ProveedorSesion>
          <App />
        </ProveedorSesion>
      </BrowserRouter>
    </ProveedorTema>
  </StrictMode>,
);
