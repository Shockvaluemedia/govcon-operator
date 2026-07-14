# API Authorization Policy

This policy applies after a verified server-side session resolves the user's current organization and role. Tenant identity always comes from that session. Authentication endpoints remain self-service or public by design and are outside this product-action matrix.

## Role intent

| Role | Intended authority |
| --- | --- |
| `owner` | Full organization and administrative authority. |
| `admin` | Full delegated organization and administrative authority. |
| `operator` | Run the day-to-day opportunity, supplier, compliance, document, and workflow operation. |
| `coach` | Advise through AI and curate personal saved opportunities and searches; no shared operational mutations. |
| `viewer` | Read authenticated organization surfaces only. |

## Action matrix

| Action | Owner | Admin | Operator | Coach | Viewer | Protected endpoints |
| --- | --- | --- | --- | --- | --- | --- |
| `admin:read` | Allow | Allow | Deny | Deny | Deny | `GET /api/admin` |
| `ai:execute` | Allow | Allow | Allow | Allow | Deny | `POST /api/ai/analyze`, `POST /api/ai/chat`, `POST /api/ai/proposal-draft` |
| `compliance:manage` | Allow | Allow | Allow | Deny | Deny | `PUT /api/compliance` |
| `documents:manage` | Allow | Allow | Allow | Deny | Deny | `POST /api/documents`, `DELETE /api/documents` |
| `opportunities:import` | Allow | Allow | Deny | Deny | Deny | `POST /api/opportunities` |
| `opportunities:save` | Allow | Allow | Allow | Allow | Deny | `POST /api/opportunities/saved`, `DELETE /api/opportunities/saved` |
| `opportunities:sync` | Allow | Allow | Allow | Deny | Deny | `POST /api/opportunities/sync` |
| `saved-searches:manage` | Allow | Allow | Allow | Allow | Deny | `POST /api/opportunities/searches`, `DELETE /api/opportunities/searches` |
| `suppliers:manage` | Allow | Allow | Allow | Deny | Deny | `POST /api/suppliers` |
| `workflows:manage` | Allow | Allow | Allow | Deny | Deny | `POST /api/workflows`, `PATCH /api/workflows` |

All authenticated roles may use protected read endpoints unless a more restrictive action appears above. Unknown roles fail closed. Denied actions return `403` before request parsing, database mutation, SAM.gov access, S3 access, or AI execution.

When a user has more than one role row for the current organization, the effective role is resolved deterministically in this order: `owner`, `admin`, `operator`, `coach`, `viewer`. Missing or unknown roles resolve to `viewer`.

## Tenant boundary

- Organization IDs from request bodies are rejected or ignored; the session organization is authoritative.
- Organization-owned queries include the session organization in their filter.
- Workflow assignees must belong to the session organization.
- A missing tenant resource returns `404` or a bounded validation error rather than crossing into another organization.

## Regression evidence

- Pure policy tests enumerate every role/action combination and unknown-role behavior.
- Authenticated demo smoke proves viewer denials, coach/operator boundaries, admin access, and cross-organization workflow-assignment rejection.
- Anonymous API smoke remains responsible for the `401` boundary across protected methods.
