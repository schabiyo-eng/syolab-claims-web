import { useSyncExternalStore } from "react";

export type Route = { kind: "home" } | { kind: "claim"; id: string };

const HOME: Route = { kind: "home" };
const CLAIM_PATH = /^\/claims\/([^/]+)\/?$/;

export function parseRoute(pathname: string): Route {
  const match = CLAIM_PATH.exec(pathname);
  if (!match?.[1]) {
    return HOME;
  }
  try {
    return { kind: "claim", id: decodeURIComponent(match[1]) };
  } catch {
    return HOME;
  }
}

export function pathOf(route: Route): string {
  switch (route.kind) {
    case "home":
      return "/";
    case "claim":
      return `/claims/${encodeURIComponent(route.id)}`;
  }
}

export function navigate(route: Route): void {
  const path = pathOf(route);
  if (window.location.pathname !== path) {
    window.history.pushState(null, "", path);
  }
  // pushState does not fire popstate, so subscribers are told directly.
  window.dispatchEvent(new PopStateEvent("popstate"));
}

function subscribe(onChange: () => void): () => void {
  window.addEventListener("popstate", onChange);
  return () => window.removeEventListener("popstate", onChange);
}

function currentPath(): string {
  return window.location.pathname;
}

function serverPath(): string {
  return "/";
}

export function useRoute(): Route {
  return parseRoute(useSyncExternalStore(subscribe, currentPath, serverPath));
}
