# Services — Business Logic

Services hold the *what* and *why* of a feature. Repositories hold the *how* of data access. Handlers are the glue.

## Location

- Per-module: `src/modules/<feature>/service.ts`
- Cross-module / domain services: `src/libs/<domain>/*.service.ts` (e.g. `mailer`)

## Rules

1. **Services are plain objects, not classes.**
   ```ts
   export const AuthService = {
     async signIn(email: string, password: string): Promise<...> { … },
   };
   ```
   No `this`, no inheritance, no constructors. The export name uses `PascalCaseService`.
2. **No Elysia or HTTP types inside services.** No `Context`, no `set.status`, no `body`. Services receive primitives/DTOs and return primitives/DTOs. Handlers do the HTTP mapping.
3. **Services orchestrate repositories.** Reach for Prisma directly only for:
   - Multi-aggregate transactions where a repository method would be a single-use wrapper
   - Trivial reads in one place that don't warrant a repository method
   Otherwise call `UserRepository()`, `RoleRepository()`, etc.
4. **Validation is layered.**
   - Schema validation (shape, format) → TypeBox in `schema.ts`
   - Business validation (uniqueness, state machine) → service, throwing custom errors from `@errors`
5. **Throw, don't return error objects.** Every failure throws `BadRequestError`, `UnauthorizedError`, `NotFoundError`, `ForbiddenError`. `ErrorHandlerPlugin` turns them into proper HTTP responses.
6. **Wrap multi-write operations in `prisma.$transaction`** and pass `tx` into repositories. See [repositories.md](./repositories.md).
7. **Cache reads, invalidate on writes.** When a service caches in Redis (e.g. `Cache.set(UserInformationCacheKey(id), …)`), the corresponding write methods in the same service must invalidate the same key. Keep cache keys in `@cache`.
8. **Log with structured fields and a message:**
   ```ts
   log.error({ error, userId }, "Failed to queue verification email");
   ```
   Object first, message second. Never log raw passwords/tokens.
9. **Silent on enumeration-leaky paths.** Endpoints like "forgot password" / "resend verification" must not reveal whether an email exists — `return` early instead of throwing. See `AuthService.forgotPassword`.
10. **Pure helpers below, public methods above.** Inside a service object, exported methods come first; module-local helpers (if any) live at the bottom as `const _internal = ...` or above the export.
11. **A service does one feature.** Cross-feature flows live in higher-level orchestrators or are coordinated by the route handler (the only place that's allowed to call multiple services).
