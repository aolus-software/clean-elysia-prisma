# DI — Dependency Injection

The DI container is the single source of truth for shared service instances. It is exposed to every route through `DiPlugin`, which `baseApp` already registers.

## Container

- Source: `src/libs/plugins/core/container.ts`
- Export: `container` (singleton instance of class `Container`)
- API:
  - `register<T>(name, factory)` — bind a factory under a string key
  - `resolve<T>(name)` — lazy-instantiate and cache; throws if unregistered
  - `reset()` — clear instances (keeps factories) — test setup only
  - `clearAll()` — drop everything — test setup only

## Rules

1. **Never instantiate the container.** Always import the `container` singleton from `@plugins/core` (or transitively via `DiPlugin`).
2. **Resolve in route context, not at import time.** Inside a handler use `({ container }) => container.resolve<MyService>("MyService")`. Top-level resolves run before registration and break ordering.
3. **Register at bootstrap.** All `container.register(...)` calls belong in `src/bootstrap.ts` (or an explicitly-imported registration module), not scattered across feature files.
4. **Use stable string keys.** Prefer the exported class/factory name (`"UserService"`, `"MailerService"`). Do not use anonymous keys or symbols.
5. **Factories must be pure constructors.** A factory may close over config but must not perform I/O — instances are cached after the first `resolve`.
6. **One implementation per key.** Re-registering an existing key is a code smell; in tests, call `clearAll()` then `register` again.
7. **Do not pass the container deep into business code.** It belongs in the composition root (bootstrap, plugins, route handlers). Repositories and services should receive their deps as function arguments.
8. **Reach for DI when a dependency has real state or config** (mailer, queue, external clients). For trivial pure helpers, just import the module — DI is not a goal in itself.

## Example

```ts
// bootstrap.ts
import { container } from "@plugins/core";
import { MailerService } from "@mailer";

container.register("MailerService", () => MailerService());

// route handler
.post("/notify", ({ container }) => {
  const mailer = container.resolve<ReturnType<typeof MailerService>>("MailerService");
  return mailer.send(...);
})
```
