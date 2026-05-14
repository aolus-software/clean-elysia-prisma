# Modules — Feature Layout

A **module** is one feature surface (auth, settings, home, …). Modules expose HTTP routes; everything reusable lives in `libs/` (see [shared-code.md](./shared-code.md)).

## Required layout

```
src/modules/<feature>/
├── index.ts     # Elysia instance, route wiring (REQUIRED)
├── schema.ts    # TypeBox body/query/response schemas (REQUIRED if the module has I/O)
└── service.ts   # business logic, plain-object export (OPTIONAL — skip if logic is trivial)
```

Nested sub-modules follow the same shape (e.g. `src/modules/settings/users/{index,schema,service}.ts`) and the parent `index.ts` composes them with `.use(...)`.

## Rules

1. **Every module is a named Elysia instance** with `prefix` and `detail.tags` set:
   ```ts
   export const FooModule = new Elysia({
     name: "foo-module",
     prefix: "/foo",
     detail: { tags: ["Foo"] },
   }).use(baseApp)…
   ```
   `name` must be unique across the app — Elysia uses it for deduplication.
2. **Always `.use(baseApp)`** as the first composition step. It pulls in request-id, logger, performance, DI, body-limit, and security.
3. **Apply `AuthPlugin` once**, immediately before the first authenticated route. Public routes go above it; protected routes below. See `src/modules/auth/index.ts` for the canonical pattern.
4. **Handlers stay thin.** Their job is parse → call service → wrap with `ResponseToolkit`. Never embed Prisma calls or business rules inside `index.ts`.
5. **No cross-module imports.** `modules/a` cannot import from `modules/b`. If two modules need the same code, move it to `libs/` (or a repository).
6. **No relative imports above the module root.** Within a module, `./schema` and `./service` are fine; anything outside the module must use a `@` alias.
7. **Group sub-modules under a parent module** (settings/permissions, settings/roles, …). The parent composes children with `new Elysia({ prefix: "/settings" }).use(ChildModule)`.
8. **Register the top-level module in `src/modules/index.ts`** by adding it to `bootstraps`. That is the only place modules are wired into the app.
9. **One file = one concern.** Don't put schemas in `index.ts` or services in `schema.ts`.

## Anti-patterns

- Adding controller classes — services are plain objects, handlers are inline.
- Re-exporting Prisma types from a module — those belong in `@types`.
- Mounting routes outside of `index.ts`.
