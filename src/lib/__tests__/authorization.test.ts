import assert from "node:assert/strict";
import test from "node:test";
import {
  AUTHORIZATION_POLICY,
  ROLES,
  canPerformAction,
  hasOrganizationAccess,
  resolveEffectiveRole,
  type AuthorizationAction,
} from "../authorization";

const allActions = Object.keys(AUTHORIZATION_POLICY) as AuthorizationAction[];

const expectedActions: Record<(typeof ROLES)[number], AuthorizationAction[]> = {
  owner: allActions,
  admin: allActions,
  operator: allActions.filter(
    (action) => action !== "admin:read" && action !== "opportunities:import"
  ),
  coach: ["ai:execute", "opportunities:save", "saved-searches:manage"],
  viewer: [],
};

for (const role of ROLES) {
  test(`${role} permissions match the documented policy`, () => {
    for (const action of allActions) {
      assert.equal(
        canPerformAction(role, action),
        expectedActions[role].includes(action),
        `${role} policy mismatch for ${action}`
      );
    }
  });
}

test("unknown roles fail closed", () => {
  for (const action of allActions) {
    assert.equal(canPerformAction("unknown", action), false);
  }
});

test("effective role resolution is deterministic and least privilege by default", () => {
  assert.equal(resolveEffectiveRole(["viewer", "operator"]), "operator");
  assert.equal(resolveEffectiveRole(["coach", "admin"]), "admin");
  assert.equal(resolveEffectiveRole(["viewer", "owner"]), "owner");
  assert.equal(resolveEffectiveRole(["unknown"]), "viewer");
  assert.equal(resolveEffectiveRole([]), "viewer");
});

test("organization access only permits an exact tenant match", () => {
  assert.equal(hasOrganizationAccess("org-a", "org-a"), true);
  assert.equal(hasOrganizationAccess("org-a", "org-b"), false);
  assert.equal(hasOrganizationAccess("org-a", ""), false);
});
