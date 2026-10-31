import type { MouseEvent, ReactNode } from "react";
import { navigate, pathOf, type Route } from "../routing";

interface RouteLinkProps {
  route: Route;
  className?: string;
  children: ReactNode;
}

function isPlainLeftClick(event: MouseEvent<HTMLAnchorElement>): boolean {
  return (
    event.button === 0 &&
    !event.metaKey &&
    !event.ctrlKey &&
    !event.shiftKey &&
    !event.altKey
  );
}

export function RouteLink({ route, className, children }: RouteLinkProps) {
  return (
    <a
      href={pathOf(route)}
      className={className}
      onClick={(event) => {
        if (event.defaultPrevented || !isPlainLeftClick(event)) {
          return;
        }
        event.preventDefault();
        navigate(route);
      }}
    >
      {children}
    </a>
  );
}
