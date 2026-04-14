import React from "react";
import ReactDOM from "react-dom/client";
import { HashRouter } from "react-router-dom";
import { Toaster, useToasterStore } from "react-hot-toast";
import App from "./App";
import "./styles.css";

function ToastLiveRegions() {
  const { toasts } = useToasterStore();
  const visibleToasts = toasts.filter((toastItem) => toastItem.visible);
  const latestAssertive = [...visibleToasts].reverse().find((toastItem) => ["error", "warning"].includes(toastItem.type));
  const latestPolite = [...visibleToasts].reverse().find((toastItem) => ["success", "loading", "blank", "custom"].includes(toastItem.type));
  const getMessage = (toastItem) => (typeof toastItem?.message === "string" ? toastItem.message : "");

  return (
    <>
      <div id="onnonn-live-polite" className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {getMessage(latestPolite)}
      </div>
      <div id="onnonn-live-assertive" className="sr-only" role="alert" aria-live="assertive" aria-atomic="true">
        {getMessage(latestAssertive)}
      </div>
    </>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <HashRouter>
      <ToastLiveRegions />
      <App />
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          success: {
            ariaProps: {
              role: "status",
              "aria-live": "polite"
            }
          },
          error: {
            ariaProps: {
              role: "alert",
              "aria-live": "assertive"
            }
          },
          loading: {
            ariaProps: {
              role: "status",
              "aria-live": "polite"
            }
          }
        }}
      />
    </HashRouter>
  </React.StrictMode>
);
