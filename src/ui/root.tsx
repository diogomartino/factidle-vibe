import { lazy, Suspense } from "react";
import { App } from "./app";

const DesignSystemPage = lazy(() => import("./design-system-page").then((m) => ({ default: m.DesignSystemPage })));

/** Two routes: the game, and `/design` showing every design-system component. */
const Root = () =>
  window.location.pathname.replace(/\/$/, "") === "/design" ? (
    <Suspense>
      <DesignSystemPage />
    </Suspense>
  ) : (
    <App />
  );

export { Root };
