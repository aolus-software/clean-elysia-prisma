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
{ "success": true, "message": "...", "data": ... }

// paginated
{ "success": true, "message": "...", "data": [...], "meta": { "page": 1, "perPage": 10, "total": 42, "totalPages": 5 } }
```

## Errors

Throw, never return error objects. Imported from `@errors`:

```ts
throw new BadRequestError("Validation error", [
  { field: "email", message: "Invalid email format" },
]);
throw new UnauthorizedError("Unauthorized");
throw new NotFoundError("User not found");
throw new ForbiddenError("You cannot do this");
```

Wire format (handled by `ErrorHandlerPlugin`):

```jsonc
{ "success": false, "message": "Validation error", "errors": [...] }
```

## Rules

1. **One success envelope.** Never construct the response object by hand — `ResponseToolkit` is canonical. Hand-written `{ success: true, data: … }` is a smell.
2. **One error vocabulary.** Use the four error classes above. If you need a new class (e.g. `ConflictError`), add it to `@errors` rather than inventing one inline.
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
