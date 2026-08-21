# Errors & Responses

The app speaks one response shape and one error vocabulary. `ErrorHandlerPlugin` (registered in `src/index.ts`) maps thrown errors to HTTP responses automatically.

## Success responses

Always use `ResponseToolkit` from `@utils`:

```ts
ResponseToolkit.success(data, "Optional message");
ResponseToolkit.created(data, "Resource created");
ResponseToolkit.paginated(rows, meta, "Listed");
```

Wire format:

```jsonc
// success
{ "status": 200, "success": true, "message": "...", "data": ... }

// paginated — note the nested `data.data` / `data.meta`
{ "status": 200, "success": true, "message": "...",
  "data": { "data": [...], "meta": { "page": 1, "limit": 10, "totalCount": 42 } } }
```

`status` is part of the **body** as well as the HTTP status — `ResponseToolkit` always emits it, so a
response schema that omits it is wrong. Pagination `meta` is exactly `{ page, limit, totalCount }`:
there is no `perPage` and no `totalPages`. See `PaginatedResponseSchema` and
`ResponseToolkit.paginated` in `src/libs/utils/elysia/response.ts`.

## Errors

Throw, never return error objects. The vocabulary is **six** classes, all imported from `@errors`
and all exported from `src/libs/errors/index.ts`. The status is the one `ErrorHandlerPlugin` assigns:

| Class                      | File                            | Status |
| -------------------------- | ------------------------------- | ------ |
| `BadRequestError`          | `bad-request-error.ts`          | 400    |
| `UnauthorizedError`        | `unauthorized-error.ts`         | 401    |
| `ForbiddenError`           | `forbidden-error.ts`            | 403    |
| `NotFoundError`            | `not-found-error.ts`            | 404    |
| `UnprocessableEntityError` | `unprocessable-entity-error.ts` | 422    |
| `RateLimitError`           | `to-many-request-error.ts`      | 429    |

All six agree three ways: each class's `code`, its `toResponse()`, and the branch
`ErrorHandlerPlugin` maps it to return the same status. Keep it that way — a class whose `code`
disagrees with what the plugin sends misleads anyone reading `error.code`.

`to-many-request-error.ts` is misspelled in the repo — that is the real path; don't rename it as a
side effect of unrelated work.

`BadRequestError` and `UnprocessableEntityError` take `(message, errors)` — the second argument is
required, so pass `[{ field, message }]` even for a single field.

```ts
throw new BadRequestError("Validation error", [
	{ field: "email", message: "Invalid email format" },
]);
throw new UnprocessableEntityError("Email already verified", [
	{ field: "email", message: "Email already verified" },
]);
throw new UnauthorizedError("Unauthorized");
throw new NotFoundError("User not found");
throw new ForbiddenError("You cannot do this");
throw new RateLimitError("Too many requests");
```

Wire format (handled by `ErrorHandlerPlugin`):

```jsonc
// classes that carry field detail — BadRequestError (400), UnprocessableEntityError (422)
{ "status": 400, "success": false, "message": "Validation error", "errors": [...] }

// the rest — 401 / 403 / 404 / 429 / 500
{ "status": 404, "success": false, "message": "User not found", "data": null }
```

## Rules

1. **One success envelope.** Never construct the response object by hand — `ResponseToolkit` is canonical. Hand-written `{ status: 200, success: true, data: … }` is a smell.
2. **One error vocabulary.** Use the six error classes above. If you need a new class (e.g. `ConflictError`), add it to `@errors`, map it in `ErrorHandlerPlugin`, and export it from `src/libs/errors/index.ts` — never invent one inline.
3. **`BadRequestError` carries field details** for validation-shaped failures. Pass `[{ field, message }]` so clients can render inline errors.
4. **Set `set.status` only for `201 Created`** (alongside `ResponseToolkit.created`). All other status codes are inferred from `ResponseToolkit` and the error class. Don't set `set.status = 400` then throw — pick one path.
5. **Log inside the service before re-throwing**, with structured context:
   ```ts
   try { … }
   catch (error) {
     log.error({ error, userId }, "Failed to update user");
     throw new BadRequestError("Failed to update user");
   }
   ```
   Don't leak raw error messages from third-party libs to clients — translate to a domain error.
6. **Never leak secrets in error messages or `errors[]` entries.** Token values, password hashes, internal stack traces — keep them out.
7. **Don't catch-and-swallow.** If you `catch`, either re-throw a translated error or handle the failure meaningfully (silent path on enumeration-leak endpoints — see [services.md](./services.md) rule 9).
8. **Route handlers never build error responses.** They call the service, which throws. The handler doesn't see error paths.
9. **Response status codes declared in `commonResponse(..., { include })`** must match what the handler can actually produce. See [validation.md](./validation.md).
