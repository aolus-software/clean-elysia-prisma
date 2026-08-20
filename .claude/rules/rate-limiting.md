# Rate Limiting — Global and Always On

`rateLimit(...)` from `elysia-rate-limit` is registered inside `SecurityPlugin` (`src/libs/plugins/security.plugin.ts`), and `SecurityPlugin` is the last entry in `baseApp` (`src/base.ts`), which every module `.use(...)`s. **Every request is throttled.** There is no per-route opt-in and no per-route opt-out — neither exists to be used.

## The actual configuration

```ts
rateLimit({
	max: 100,
	duration: 60 * 1000,
	headers: true,
	errorResponse: new RateLimitError(),
}),
```

100 requests per 60 seconds per client, with `RateLimit-*` response headers on.

**These numbers are hardcoded in the plugin.** This is a real divergence from the NestJS siblings, which drive their throttler from `THROTTLER_TTL` / `THROTTLER_LIMIT` env vars. No such variable exists here, in `.env.example` or in `@config`. Changing the limit means editing `security.plugin.ts`.

If the limit ever needs to differ per environment, the right fix is a field on a `@config` object read by the plugin — one named source, not numbers scattered across call sites. Until someone does that, the hardcoded pair is the whole story; do not write code, docs, or `.env` entries implying otherwise.

## Rules

1. **`RateLimitError` lives at `src/libs/errors/to-many-request-error.ts`** and is exported from `@errors`. The filename is misspelled. That is the real path — don't "fix" it in an import.
2. **The 429 body is produced by the plugin, not by `ErrorHandlerPlugin`.** `RateLimitError.toResponse()` emits `{ status: 429, success: false, message: "rate-limited" }` directly. Consequently `throw new RateLimitError()` from your own code will **not** render as a 429 — use `ResponseToolkit.tooManyRequests(...)` for a deliberate one. See [errors-and-responses.md](./errors-and-responses.md).
3. **`headers: true` is load-bearing.** A client can read its own remaining budget, so a caller that retries blindly is ignoring information it already has. Don't add a retry loop that papers over a 429.
4. **429 belongs in `commonResponse(..., { include: [...] })` only where the route documents it.** No route does today. That is defensible — the policy is uniform and repeating it on 40 routes is noise — but be honest about the consequence: **any** route in this app can return 429 whether or not its OpenAPI block says so. See [openapi.md](./openapi.md).
5. **`commonPaginatedResponse` has no 429 branch.** Passing `429` in its `include` silently does nothing. Don't.
6. **Credential endpoints may be tightened, never loosened.** `POST /auth/login`, `/auth/forgot-password`, `/auth/reset-password`, `/auth/verify-email`, and `/auth/resend-verification` are unauthenticated and enumerable. A stricter policy on them is welcome; an exemption is not.
7. **A per-route override means a scoped plugin, not an edit to the global.** There is no override mechanism wired up. Composing one looks like this:
   ```ts
   export const AuthRateLimitPlugin = new Elysia({ name: "auth-rate-limit" }).use(
   	rateLimit({
   		max: 10,
   		duration: 60 * 1000,
   		errorResponse: new RateLimitError(),
   	}),
   );
   ```
   The auth module `.use(...)`s it; it stacks **on top of** the global bucket rather than replacing it, which is the behaviour you want for tightening. Name the numbers as constants and comment why that route differs. See [plugins.md](./plugins.md).
8. **Never register `rateLimit(...)` a second time at app level.** Elysia dedups by plugin `name`; an anonymous second registration is **not** deduped and double-counts every request against the bucket.
9. **Don't relax the global limit to accommodate one noisy caller.** A machine-to-machine or webhook endpoint that bursts from a single IP is the one case for a deliberately high scoped limit — scoped, not global.
10. **Don't rename `to-many-request-error.ts` as a drive-by.** If it ever gets fixed it is its own change, with the `@errors` barrel and every import moved together.
