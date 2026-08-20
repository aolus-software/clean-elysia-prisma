# Project Rules

Coding rules for the `clean-elysia-prisma` codebase. Each file is a focused, enforceable contract — read the relevant rule before writing code in that area.

## Always in scope

These three apply to **every** change, regardless of which files it touches. Read them first.

| Rule                                           | Scope                                                                                                             |
| ---------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| [contradiction-halt.md](./contradiction-halt.md) | A request that contradicts a rule, the architecture, or a security invariant is reported and halted — never silently implemented or worked around. Lists the known issues already on record |
| [documentation.md](./documentation.md)         | A doc your change makes wrong is fixed in the **same** change; lists every doc that must stay in sync              |
| [audit-findings.md](./audit-findings.md)       | How an audit finding is written: five blocks, plain language, severity by consequence, CONFIRMED vs SUSPECT — the writing contract for [`/audit-flow`](../commands/audit-flow.md) |

## Requested rules

| Rule                                 | Scope                                                     |
| ------------------------------------ | --------------------------------------------------------- |
| [di.md](./di.md)                     | Dependency injection container & `DiPlugin`               |
| [modules.md](./modules.md)           | Feature module layout under `src/modules/`                |
| [openapi.md](./openapi.md)           | OpenAPI / Scalar documentation, `detail`, tags, security  |
| [queue.md](./queue.md)               | BullMQ queues, workers, retries                           |
| [repositories.md](./repositories.md) | Prisma repository factory pattern & transactions          |
| [shared-code.md](./shared-code.md)   | Anything reusable across modules **must** live in `libs/` |

## Suggested rules

| Rule                                                 | Scope                                                   |
| ---------------------------------------------------- | ------------------------------------------------------- |
| [services.md](./services.md)                         | Plain-object service exports, business logic boundaries |
| [validation.md](./validation.md)                     | TypeBox schemas in `schema.ts`, request/response shape  |
| [errors-and-responses.md](./errors-and-responses.md) | Custom errors + `ResponseToolkit` envelope              |
| [imports-and-naming.md](./imports-and-naming.md)     | Path aliases, import order, file naming                 |
| [plugins.md](./plugins.md)                           | Elysia plugin conventions (`name`, composition)         |

## How to use

- These rules complement `CLAUDE.md` — they don't replace it.
- When a rule conflicts with `CLAUDE.md`, the rule file wins (it's more specific).
- Don't introduce a new pattern without updating the relevant rule first.
