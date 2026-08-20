# Elysia — App Structure and Layering

The framework-level contract: what each layer may do, what already exists, and where the global stack lives. Per-file detail is in [modules.md](./modules.md), [services.md](./services.md), [repositories.md](./repositories.md), and [validation.md](./validation.md) — this rule is the shape they fit into.

## Layering

```
route handler (index.ts) -> service.ts -> repository -> Prisma -> PostgreSQL
```

- **Handler** does HTTP only: destructure the context, call **one** service method, wrap the result with `ResponseToolkit`. Authorization goes in `beforeHandle`.
- **Service** owns business logic: state-dependent validation, transactions, cache invalidation, queue dispatch. It is the layer that opens a transaction.
- **Repository** owns Prisma queries and is constructed with an optional transaction client — it never opens a transaction of its own.

## Rules

1. **Never skip a layer.** A handler does not import `prisma` to run a query, and a repository does not decide business rules. The health route is the one deliberate exception: `src/modules/health/index.ts` touches the DB for a liveness probe, which is not a query and is not a precedent.
2. **A handler is the only place allowed to call two services.** Cross-feature orchestration never lives inside a service that belongs to one feature.
3. **Services are plain object literals** — `export const UserService = { ... }`. No classes, no `this`, no constructors. This holds for the mailer services too: `AuthMailService` is an object here, unlike in the sibling `clean-elysia`. See [services.md](./services.md).
4. **Repositories are factory functions that take the transaction client as an argument**, not per-method:
   ```ts
   export function UserRepository(tx?: Prisma.TransactionClient) {
   	const db = tx || prisma;
   	return { /* methods */ };
   }
   ```
   Concrete files live at `src/libs/database/postgres/repositories/<name>.repository.ts` and are re-exported through `src/libs/repositories/index.ts` (`@repositories`). Invoke the factory per call — `await UserRepository().findOne(id)` — and pass `tx` in when inside a transaction. See [repositories.md](./repositories.md).
5. **Reuse before you build.** Check these before adding a helper, a guard, a constant, or a response shape:
   | Alias | Already there |
   | --- | --- |
   | `@utils` | `ResponseToolkit`, `DatatableToolkit`, `commonResponse`, `commonPaginatedResponse`, `Hash`, `EncryptionToolkit`, `StrToolkit`, `DateToolkit`, `NumberToolkit`, `log` |
   | `@plugins` | `AuthPlugin`, `DiPlugin`, `DocsPlugin`, `ErrorHandlerPlugin`, `LocalePlugin`, `LoggerPlugin`, `PerformancePlugin`, `RequestPlugin`, `SecurityPlugin`, `BodyLimitPlugin`, `container` |
   | `@guards` | `PermissionGuard`, `RoleGuard` — both `static canActivate(user, [...])`, called from `beforeHandle` |
   | `@errors` | `BadRequestError`, `UnauthorizedError`, `ForbiddenError`, `NotFoundError`, `UnprocessableEntityError`, `RateLimitError` |
   | `@default` | `StrongPassword`, `paginationLength`, `defaultSort`, `maxUploadFile`, `allowedFileMimeTypes`, token lifetimes |
   | `@cache` | `Cache` (`get`/`set`/`del`), `UserInformationCacheKey` |
   | `@types` | `DatatableType`, `PaginationResponse`, `EmailOptions`, and the per-entity DTOs |

   Anything genuinely new that more than one module uses goes into a `src/libs/` bucket, never into a module — see [shared-code.md](./shared-code.md).
6. **Config comes only from `@config`:** `AppConfig`, `DatabaseConfig`, `JWT_CONFIG`, `MailConfig`, `CORSConfig`, `RedisConfig`, `clickhouseConfig`. `env` is validated once in `src/libs/config/env.config.ts` and everything derives from it. **Never read `process.env` outside `src/libs/config/`** — add a typed field to a config object instead.
7. **`baseApp` owns the global stack.** `src/base.ts` composes `RequestPlugin`, `LocalePlugin`, `LoggerPlugin`, `PerformancePlugin`, `DiPlugin`, `BodyLimitPlugin`, `SecurityPlugin` in that order. CORS, helmet, rate limiting, request id, locale resolution, body limits, and DI are configured **once**, there. Don't introduce a global concern from inside a module — see [plugins.md](./plugins.md).
8. **Plugin dedup is by `name`.** Elysia applies a *named* plugin once no matter how many modules `.use` it — which is why every module can safely `.use(baseApp)`, and they all do. An **anonymous** instance is not deduped and will run twice: that is how you double-count a request against the rate limit bucket or log every request twice. Give every plugin you write a `name`.
9. **`AuthPlugin` is not in `baseApp`.** Authentication is opt-in: a module chains `.use(baseApp).use(AuthPlugin)` and puts public routes above the `AuthPlugin` call. A route behind `AuthPlugin` with no `beforeHandle` guard is authenticated but unauthorized — any logged-in user can call it.
10. **`ErrorHandlerPlugin` and `DocsPlugin` are registered in `src/server.ts`**, outside `baseApp`, wrapping `bootstraps` from `@modules`. Thrown `@errors` classes become HTTP responses there — see [errors-and-responses.md](./errors-and-responses.md). Note the 429 from the rate limiter does **not** pass through it ([rate-limiting.md](./rate-limiting.md)).
11. **Module directory names are plural for collections** — `settings/users/`, `settings/roles/`, `settings/permissions/` — and OpenAPI tags use the spaced-dash form, `"Settings - Users"`. Both differ from the sibling `clean-elysia`; match this repo, not that one. See [openapi.md](./openapi.md).
12. **Every user-facing string is a catalog key**, not an English literal — [i18n.md](./i18n.md). All seven modules comply as of 2026-08-20; keep it that way.

## Sibling rules

[modules.md](./modules.md) · [services.md](./services.md) · [repositories.md](./repositories.md) · [validation.md](./validation.md) · [errors-and-responses.md](./errors-and-responses.md) · [plugins.md](./plugins.md) · [di.md](./di.md) · [openapi.md](./openapi.md) · [shared-code.md](./shared-code.md) · [imports-and-naming.md](./imports-and-naming.md) · [queue.md](./queue.md) · [i18n.md](./i18n.md) · [mail.md](./mail.md) · [rate-limiting.md](./rate-limiting.md) · [clean-code.md](./clean-code.md)

When this rule and a layer rule disagree on a detail, the layer rule is more specific and wins.
