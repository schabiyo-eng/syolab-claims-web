import type { ComponentType } from "react";
import type { Role } from "../api/types";
import { ClaimantDesk } from "./ClaimantDesk";
import { ClaimsQueue } from "./ClaimsQueue";

const HOME: Record<Role, ComponentType> = {
  CLAIMANT: ClaimantDesk,
  ADJUSTER: ClaimsQueue,
};

export function RoleHome({ role }: { role: Role }) {
  const Home = HOME[role];
  return <Home />;
}
