import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { RegistrationProvider } from "./context/registration-context";

createRoot(document.getElementById("root")!).render(
  <RegistrationProvider>
    <App />
  </RegistrationProvider>
);
