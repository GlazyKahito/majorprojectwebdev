import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "@fontsource-variable/geist";
import "@fontsource-variable/geist-mono";
import "./styles/tokens.css";
import "./styles/base.css";
import "./styles/components.css";
import "./styles/layout.css";
import "./styles/pages.css";
import App from "./App";
import { AuthProvider } from "./context/AuthContext";
import { ToastProvider } from "./context/ToastContext";
import { NotificationProvider } from "./context/NotificationContext";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <NotificationProvider>
            <App />
          </NotificationProvider>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  </StrictMode>
);
