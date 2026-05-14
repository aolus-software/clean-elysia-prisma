# Shared Code — Must Live in `libs/`

**If two or more modules use it, it belongs in `libs/`.** Period.

`src/modules/` is for feature surfaces. `src/libs/` is for everything reusable. This separation is what keeps the codebase from devolving into circular module imports.

## Where to put shared code

| Concern                               | Directory                                                                     | Alias           |
| ------------------------------------- | ----------------------------------------------------------------------------- | --------------- |
| Env-validated config                  | `libs/config/`                                                                | `@config`       |
| Prisma / Redis / ClickHouse clients   | `libs/database/`                                                              | `@database`     |
| Repositories (Prisma queries)         | `libs/database/postgres/repositories/` (re-exported via `libs/repositories/`) | `@repositories` |
| Cache helpers + key constants         | `libs/cache/`                                                                 | `@cache`        |
| Custom error classes                  | `libs/errors/`                                                                | `@errors`       |
| Auth/role/permission guards           | `libs/guards/`                                                                | `@guards`       |
| Nodemailer transport + mail services  | `libs/mailer/`                                                                | `@mailer`       |
| Elysia plugins (cross-cutting)        | `libs/plugins/`                                                               | `@plugins`      |
| Domain TypeScript interfaces / DTOs   | `libs/types/`                                                                 | `@types`        |
| App-wide constants (pagination, etc.) | `libs/default/`                                                               | `@default`      |
| Generic utilities (`Hash`, `log`, …)  | `libs/utils/`                                                                 | `@utils`        |

## Rules

1. **A module cannot import from another module.** If you find yourself wanting to, the shared piece moves to `libs/`. This rule is non-negotiable — it prevents the "every module imports every module" anti-graph.
2. **A module CAN import from `libs/` freely**, using the path aliases above. Never use relative imports across layers.
3. **`libs/` cannot import from `modules/`.** It's a one-way dependency. If a library function needs feature-specific data, lift the data through arguments — don't reach across.
4. **One concept = one home.** Don't duplicate constants/types/utilities between modules. Move the shared piece to `libs/` on the first duplication, not the third.
5. **Group `libs/` by responsibility, not by feature.** `libs/cache/auth-keys.ts` is fine; `libs/auth/cache.ts` is not — auth-specific logic belongs in the auth module unless reused.
6. **Every `libs/` subdir should have an `index.ts`** that re-exports the public surface. Consumers import from the alias, never from a deep path.
7. **Types live in `@types`, organized by domain** (`user.types.ts`, `pagination.types.ts`). Never colocate types in `libs/utils/`.
8. **Keep `libs/` framework-agnostic where possible.** Elysia-specific helpers belong in `libs/plugins/`. Generic toolkits (`DateToolkit`, `Hash`) should stand alone.
9. **No `console.log` anywhere in `libs/`.** Use the shared `log` from `@utils`.

## Decision flow

```
Need a thing in feature A.
└── Will any other module ever need it?
    ├── No  → keep it inside the module
    └── Yes → put it in libs/<right-folder> and import via @alias
```

When unsure, default to `libs/`. Moving down later is cheap; untangling cross-module imports is not.
