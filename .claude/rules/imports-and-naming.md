# Imports & Naming

## Path aliases

Always use aliases for cross-layer imports. **Never** use relative paths like `../../libs/...`.

| Alias               | Maps to                           |
| ------------------- | --------------------------------- |
| `@base`             | `src/base.ts`                     |
| `@bull`             | `src/bull/`                       |
| `@cache`            | `src/libs/cache/`                 |
| `@config`           | `src/libs/config/`                |
| `@database`         | `src/libs/database/`              |
| `@default`          | `src/libs/default/`               |
| `@errors`           | `src/libs/errors/`                |
| `@guards`           | `src/libs/guards/`                |
| `@mailer`           | `src/libs/mailer/`                |
| `@plugins`          | `src/libs/plugins/`               |
| `@repositories`     | `src/libs/repositories/`          |
| `@types`            | `src/libs/types/`                 |
| `@utils`            | `src/libs/utils/`                 |
| `@modules`          | `src/modules/`                    |
| `@prisma-generated` | `prisma/generated/prisma-client/` |

Relative imports are allowed **only** within the same module (`./schema`, `./service`).

## Import order

Group imports in this order, separated by a blank line:

1. **External libraries** — `elysia`, `bullmq`, `@elysiajs/jwt`, etc.
2. **Aliases**, ordered by dependency direction: `@config` → `@database` → `@errors` → `@types` → `@repositories` → `@utils` → others.
3. **Relative imports** — only from inside the current module.

Example:

```ts
import { Elysia, t } from "elysia";

import { baseApp } from "@base";
import { prisma } from "@database";
import { BadRequestError } from "@errors";
import { UserRepository } from "@repositories";
import { UserInformation } from "@types";
import { log } from "@utils";
import { AuthPlugin } from "@plugins";

import { LoginSchema } from "./schema";
import { AuthService } from "./service";
```

## File naming

- **kebab-case + role suffix:**
  - `user.repository.ts`
  - `auth.service.ts`
  - `auth.plugin.ts`
  - `send-mail-worker.ts`
  - `send-mail-queue.ts`
- Module entry: `index.ts`, schemas: `schema.ts`, services: `service.ts` (no role suffix inside a module — the folder is the namespace).

## Symbol naming

- Repositories: `PascalCaseRepository` factory (`UserRepository`)
- Services: `PascalCaseService` plain-object export (`AuthService`)
- Plugins: `PascalCasePlugin` (`AuthPlugin`, `SecurityPlugin`)
- Modules: `PascalCaseModule` (`AuthModule`, `UsersModule`)
- Schemas: `PascalCase` ending in `Schema` (`LoginSchema`, `UserListResponseSchema`)
- Types: `PascalCase` (`UserInformation`, `DatatableType`)
- Cache key builders: `<Concept>CacheKey` function exported from `@cache`

## TypeScript

- Strict mode is on (`noUnusedLocals`, `noUnusedParameters`, `noImplicitReturns`).
- Prefer explicit return types on exported functions, especially in services and repositories.
- No `any`. If you truly need it, use `unknown` and narrow.
- Comments only when the **why** is non-obvious. No inline narration of obvious code.
- No `console.log` — use `log` from `@utils`.
