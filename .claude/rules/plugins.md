# Elysia Plugins

Plugins are Elysia instances that add cross-cutting behavior (auth, logging, security, …). They live in `src/libs/plugins/` and are exposed via `@plugins`.

## Rules

1. **Every plugin is a named Elysia instance:**
   ```ts
   export const SecurityPlugin = new Elysia({ name: "security-plugin" })
     .use(helmet())
     .use(rateLimit(...));
   ```
   The `name` must be unique — Elysia uses it to dedupe `.use()` calls. Convention: `kebab-case`, often ending in `-plugin`.
2. **Filename: `<concern>.plugin.ts`** (`auth.plugin.ts`, `security.plugin.ts`). Re-export from `src/libs/plugins/index.ts`.
3. **Plugins compose plugins.** A plugin can `.use(otherPlugin)` but should not register routes (that's a module's job). Exception: docs plugin owns `/docs`.
4. **`baseApp` owns the global stack.** Don't add new global plugins by editing each module — add them to `baseApp` in `src/base.ts` if they should run everywhere.
5. **Authentication is opt-in per route group.** `AuthPlugin` is *not* in `baseApp`. Modules call `.use(AuthPlugin)` before the routes that need a logged-in user, leaving public routes above it.
6. **Plugins use the DI container, they don't replace it.** A plugin can resolve services and attach them to context via `.derive(...)`, but the container remains the source of truth.
7. **Plugins are stateless modules.** They can hold instantiated middleware (helmet, rate-limit) but not per-request state. Per-request data goes on the Elysia context.
8. **No business logic in plugins.** A plugin that calls `UserRepository` to fetch the current user is fine; a plugin that decides whether to send an email is not.
9. **Bootstrapping order matters.** Inside `baseApp`:
   - `RequestPlugin` first (request-id available for logs)
   - `LoggerPlugin` next (so subsequent plugins log with request-id)
   - `PerformancePlugin`, then `DiPlugin`, `BodyLimitPlugin`, `SecurityPlugin`
   Don't reorder without understanding the dependency chain.
10. **Errors thrown inside a plugin bubble to `ErrorHandlerPlugin`** in `src/index.ts`. Throw the same custom errors from `@errors` you would in a service.
