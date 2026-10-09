import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Provider } from "react-redux";
import "./index.css";
import { store } from "./store/store";
import { ToastProvider } from "./ui/design/toast";
import { TooltipProvider } from "./ui/design/tooltip";
import { Root } from "./ui/root";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Provider store={store}>
      <TooltipProvider>
        <ToastProvider>
          <Root />
        </ToastProvider>
      </TooltipProvider>
    </Provider>
  </StrictMode>,
);
