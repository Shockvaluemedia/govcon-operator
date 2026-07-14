import type { Role } from "@prisma/client";

export const AUTHORIZATION_POLICY = {
  "admin:read": {
    roles: ["owner", "admin"],
    description: "View organization administration and system metrics.",
  },
  "ai:execute": {
    roles: ["owner", "admin", "operator", "coach"],
    description: "Run AI analysis, chat, and proposal-draft actions.",
  },
  "compliance:manage": {
    roles: ["owner", "admin", "operator"],
    description: "Change the organization compliance profile.",
  },
  "documents:manage": {
    roles: ["owner", "admin", "operator"],
    description: "Create or delete organization document records.",
  },
  "opportunities:import": {
    roles: ["owner", "admin"],
    description: "Create opportunity records outside the SAM.gov sync flow.",
  },
  "opportunities:save": {
    roles: ["owner", "admin", "operator", "coach"],
    description: "Save or unsave opportunities for the current user.",
  },
  "opportunities:sync": {
    roles: ["owner", "admin", "operator"],
    description: "Call SAM.gov and update the shared opportunity catalog.",
  },
  "saved-searches:manage": {
    roles: ["owner", "admin", "operator", "coach"],
    description: "Create, update, or delete the current user's saved searches.",
  },
  "suppliers:manage": {
    roles: ["owner", "admin", "operator"],
    description: "Create and maintain organization supplier records.",
  },
  "workflows:manage": {
    roles: ["owner", "admin", "operator"],
    description: "Create or update organization bid workflows.",
  },
} as const satisfies Record<
  string,
  { roles: readonly Role[]; description: string }
>;

export type AuthorizationAction = keyof typeof AUTHORIZATION_POLICY;

export const ROLES: readonly Role[] = [
  "owner",
  "admin",
  "operator",
  "coach",
  "viewer",
];

export function canPerformAction(
  role: string,
  action: AuthorizationAction
): boolean {
  const allowedRoles: readonly string[] = AUTHORIZATION_POLICY[action].roles;
  return allowedRoles.includes(role);
}

export function resolveEffectiveRole(roles: readonly string[]): Role {
  return ROLES.find((role) => roles.includes(role)) ?? "viewer";
}

export function hasOrganizationAccess(
  actorOrganizationId: string,
  resourceOrganizationId: string
): boolean {
  return actorOrganizationId === resourceOrganizationId;
}
