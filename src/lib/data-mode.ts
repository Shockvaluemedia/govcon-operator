import type { NextRequest } from "next/server";

export function requiresDatabase(request?: NextRequest): boolean {
  return (
    process.env.GOVCON_STRICT_DATA === "true" ||
    request?.headers.get("x-govcon-data-mode") === "database" ||
    request?.nextUrl.searchParams.get("dataMode") === "database"
  );
}

export function databaseMeta(total?: number) {
  return total === undefined ? { source: "database" } : { source: "database", total };
}
