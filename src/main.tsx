import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/api";
import { RouterProvider } from "@tanstack/react-router";
import "./styles.css";
async function start() {
  if (import.meta.env.VITE_MOCKS !== "false") {
    const { setupWorker } = await import("msw/browser");
    const { init } = await import("./mocks/database");
    const { handlers, resumeOrders } = await import("./mocks/handlers");
    await init();
    await setupWorker(...handlers).start({ onUnhandledRequest: "bypass" });
    resumeOrders();
    document.documentElement.dataset.mocks = "ready";
  }
  const [{ SessionProvider }, { router }] = await Promise.all([
    import("./lib/session"),
    import("./router"),
  ]);
  ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
      <QueryClientProvider client={queryClient}>
        <SessionProvider>
          <RouterProvider router={router} />
        </SessionProvider>
      </QueryClientProvider>
    </React.StrictMode>,
  );
}
void start();
