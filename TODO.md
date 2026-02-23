# Clean Elysia - Improvement TODO List

## 🔴 High Priority

### API Documentation

- [x] **Upgrade to Scalar API Documentation** (like clean-hono)
  - Configured `@elysiajs/openapi` with `provider: "scalar"`.
  - Scalar UI served at `/docs` with better UX

### Script Consistency

- [x] **Standardize npm scripts naming convention**
  - Added: `dev:server`, `dev:worker`, `dev:all` scripts
  - Added: `start:server`, `start:worker`, `start:all` scripts
  - Added: `build:server`, `build:worker`, `build:all` scripts
  - Kept backward-compatible `dev`, `start`, `build` aliases

### Database Management

- [x] **Add comprehensive Drizzle CLI scripts**
  - Added: `db:generate`, `db:migrate`, `db:push`, `db:studio`, `db:drop`, `db:seed`
  - All scripts use `bunx drizzle-kit` with existing `drizzle.config.ts`
  - Kept backward-compatible `db:postgres:seed` alias

### Configuration Management

- [x] **Implement environment validation**
  - Added `envalid` package with `env.config.ts`
  - All config files now use validated `env` object instead of raw `process.env`
  - Fails fast at startup with clear error messages for invalid env vars

## 🟡 Medium Priority

### Project Structure

- [x] **Reorganize utilities structure**
  - Flattened: `toolkit/` files (date.ts, number.ts, string.ts) moved to `utils/` root
  - Updated `utils/index.ts` to flat export style (matching clean-hono)
  - Fixed imports referencing `toolkit/` path

### Type Safety

- [x] **Add TypeScript strict checks**
  - `typecheck` script already existed ✓
  - Enabled: `noUnusedLocals`, `noUnusedParameters`, `noImplicitReturns`, `noFallthroughCasesInSwitch`

### Code Quality

- [x] **Enhance ESLint configuration**
  - Already configured with `eslint-plugin-simple-import-sort` ✓
  - Import sorting rules already present ✓
  - Config already matches clean-hono pattern ✓

### OpenAPI Schema Enhancement

- [x] **Improve OpenAPI schema definitions**
  - Added descriptions and examples to all module schemas (auth, user, role, permission, home)
  - `commonResponse` helper already implemented ✓
  - Schemas now include `description` and `examples` for better API docs

### Middleware & Plugins

- [x] **Add missing middleware**
  - Added `PerformancePlugin` - logs request duration, warns on slow requests (>1s)
  - Added `BodyLimitPlugin` - restricts request payload to 100KB
  - Registered both in `base.ts` middleware chain

### DI Pattern

- [x] **Implement Dependency Injection pattern**
  - Created `Container` class in `src/libs/plugins/core/container.ts`
  - Created `bootstrap.ts` to register all services in DI container
  - Created `DiPlugin` to inject container into Elysia context
  - Updated `index.ts` to call bootstrap at startup

## 🟢 Low Priority

### Documentation

- [ ] **Enhance README.md**
  - Add more architecture diagrams
  - Add troubleshooting section
  - Document API authentication flow
  - Add examples for common use cases
  - Document background job patterns

### Testing

- [ ] **Add test infrastructure**
  - No tests currently exist
  - Add testing framework (Bun test, Jest, or Vitest)
  - Add unit tests for services
  - Add integration tests for API endpoints
  - Add E2E tests for critical flows

### Developer Experience

- [ ] **Add Makefile** (like clean-hono)
  - Provide convenient shortcuts for common tasks
  - Example: `make dev-all`, `make fresh`, `make reset`
  - Better DX for developers

### Environment Files

- [ ] **Enhance .env.example**
  - Add more detailed comments for each variable
  - Add example values that work out of the box
  - Document which variables are required vs optional
  - Match clean-hono's detailed env structure

### Code Organization

- [ ] **Standardize file naming**
  - Routes: Currently `index.ts` inside module folders
  - Consider: Explicit `routes.ts` naming (like clean-hono)
  - More discoverable file structure

### Logging

- [ ] **Enhance logging patterns**
  - Current: Basic pino logging
  - Add structured logging for better observability
  - Add log correlation IDs
  - Add performance metrics logging

### Security

- [ ] **Security hardening**
  - Add security headers validation
  - Add input sanitization middleware
  - Add CSRF protection (if needed)
  - Add API key authentication option
  - Document security best practices

## 📊 Comparison Notes (vs clean-hono)

**What clean-hono does better:**

1. ✅ Scalar API documentation (modern, interactive)
2. ✅ Complete Drizzle CLI scripts
3. ✅ Environment validation with envalid
4. ✅ Better script organization (server/worker separation)
5. ✅ Dependency injection pattern
6. ✅ Performance monitoring middleware
7. ✅ Makefile for common tasks
8. ✅ More detailed error response schemas
9. ✅ Better organized route files (routes.ts vs index.ts)

**What clean-elysia does better:**

1. ✅ Cleaner base app setup
2. ✅ More modular plugin architecture
3. ✅ Better security plugin organization
4. ✅ Simpler auth middleware pattern

## 🎯 Recommended Implementation Order

1. **Phase 1** (Quick wins):
   - Add npm script standardization
   - Add Drizzle CLI scripts
   - Add typecheck script

2. **Phase 2** (API improvements):
   - Upgrade to Scalar documentation
   - Add environment validation
   - Enhance OpenAPI schemas

3. **Phase 3** (Architecture):
   - Reorganize utils structure
   - Consider DI pattern
   - Add missing middleware

4. **Phase 4** (Quality):
   - Add testing infrastructure
   - Enhance documentation
   - Add Makefile
