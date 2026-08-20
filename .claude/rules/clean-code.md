# Clean Code — Formatting, Types, Logging

Formatting and most type discipline are machine-enforced. This rule states what the machine checks and the conventions it cannot.

## Commands

| Task | Script | Make target |
| --- | --- | --- |
| Lint | `bun run lint` | `make lint` |
| Lint and fix | `bun run lint:fix` | `make lint-fix` |
| Format | `bun run format` | `make format` |
| Check formatting only | `bun run format:check` | *(none)* |
| Type check | `bun run typecheck` | `make typecheck` |

`typecheck` is `bun run tsc --noEmit` — **bare `tsc` is not on `PATH`**, so it must go through Bun. There is no `make format-check`; use the script.

## Rules

1. **Prettier owns formatting** (`.prettierrc`): tabs at width 2, double quotes, semicolons, trailing commas everywhere, print width 80, LF endings. Don't hand-align, don't argue, and don't reformat a file the change didn't otherwise touch — that churn is its own commit.
2. **Imports are sorted by `simple-import-sort` at error level.** Never hand-order them. Alias conventions are in [imports-and-naming.md](./imports-and-naming.md).
3. **No `any`.** `@typescript-eslint/no-explicit-any` is an **error**. Use `unknown` and narrow; `catch (err: unknown)` is the shape. Don't cast your way past a type you don't like.
4. **Explicit return types on every exported function**, and explicit parameter types throughout. ESLint does *not* enforce this — `explicit-function-return-type` is not configured — so it is on the author. An exported service or repository method with an inferred return type is a review comment.
5. **Strict mode is on**, with `noUnusedLocals`, `noUnusedParameters`, `noImplicitReturns`, and `noFallthroughCasesInSwitch` (`tsconfig.json`). An intentionally unused parameter gets a `_` prefix, not a disable comment.
6. **Declare nullable and union locals explicitly**: `const user: UserDetail | null = await ...`.
7. **No floating promises.** `@typescript-eslint/no-floating-promises` is an **error** — every promise is awaited, returned, or explicitly `.catch(...)`ed. There is no fire-and-forget here; background work goes to BullMQ ([queue.md](./queue.md)), and the enqueue itself is awaited. Prefer `async`/`await` over chains.
8. **No `console.*`.** The rule is configured as a *warning*, which understates it — treat it as forbidden in application code. Use the structured pino `log` from `@utils`, **object first, message second**:
   ```ts
   log.info({ userId, email: user.email, lang }, "Verification email queued");
   log.error({ error, userId }, "Failed to queue verification email");
   ```
   The object is the queryable part: put identifiers there and keep the message a fixed string rather than interpolating values into it. Never log a password, token, or token-bearing URL.
9. **`eslint-disable` needs a reason.** The existing ones are all in code that runs before or outside the logger (`src/index.ts` cluster bootstrap, `src/server.ts`, `src/bull/index.ts`, the ClickHouse migrate script) or in genuinely untyped territory (`error-handler.plugin.ts` narrowing an unknown thrown value). Modules, services, and repositories have none — keep it that way.
10. **One block comment above a function, class, or non-obvious block**, explaining what and why. No line-by-line narration of statements that already read clearly. Delete commented-out code instead of shipping it.
11. **No emoji, icons, box-drawing, or decorative symbols** — in code, comments, log messages, catalogs, mail templates, or generated files.
12. **Handle errors explicitly.** A `catch` that logs nothing and re-raises nothing is a bug. Throw the errors from `@errors` ([errors-and-responses.md](./errors-and-responses.md)) rather than returning error-shaped objects.
13. **Never touch `process.env` outside `src/libs/config/`.** Read config through `@config` — see [elysia.md](./elysia.md).
14. **Never hand-edit generated output.** `prisma/generated/` (gitignored and ESLint-ignored) comes from `bunx --bun prisma generate`; `src/libs/i18n/locales/keys.generated.ts` comes from `bun run i18n:keys`.
15. **No new README, CHANGELOG, or docs file unless asked.** Keeping an *existing* doc true is a separate and standing obligation — see [documentation.md](./documentation.md).
