import { createRouter } from "@tanstack/react-router";
import { AppErrorComponent } from "@/lib/error-component";
import { routeTree } from "./routeTree.gen";

function basepath(): string | undefined {
  const b = import.meta.env.BASE_URL.replace(/\/$/, "");
  return b && b !== "/" ? b : undefined;
}

export function getRouter() {
  return createRouter({
    routeTree,
    basepath: basepath(),
    defaultErrorComponent: AppErrorComponent,
  });
}
