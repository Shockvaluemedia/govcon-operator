import { NextResponse } from "next/server";
import { getCurrentUser, type AuthUser } from "@/lib/auth";
import {
  canPerformAction,
  type AuthorizationAction,
} from "@/lib/authorization";

type ApiAuthorizationResult =
  | { ok: true; user: AuthUser }
  | { ok: false; response: NextResponse };

export async function authorizeApiAction(
  action: AuthorizationAction
): Promise<ApiAuthorizationResult> {
  const user = await getCurrentUser();

  if (!user) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Unauthorized", code: "UNAUTHENTICATED" },
        { status: 401 }
      ),
    };
  }

  if (!canPerformAction(user.role, action)) {
    console.warn("Authorization denied", {
      event: "authorization_denied",
      action,
      userId: user.id,
      organizationId: user.organizationId,
      role: user.role,
    });

    return {
      ok: false,
      response: NextResponse.json(
        { error: "Forbidden", code: "INSUFFICIENT_ROLE" },
        { status: 403 }
      ),
    };
  }

  return { ok: true, user };
}
