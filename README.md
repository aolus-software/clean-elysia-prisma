# Clean Elysia

A clean architecture backend API built with Elysia.js, TypeScript, and Bun.

## Features

- Clean architecture pattern with separation of concerns
- Elysia.js web framework with TypeBox validation
- PostgreSQL with Prisma ORM
- Redis for caching and rate limiting
- BullMQ for background job processing
- ClickHouse for analytics (optional)
- Comprehensive authentication and authorization (RBAC)
- API documentation with OpenAPI and Scalar
- Docker support

## Tech Stack

- **Runtime**: Bun
- **Framework**: Elysia.js
- **Language**: TypeScript
- **Databases**: PostgreSQL, Redis, ClickHouse
- **ORM**: Prisma 7 (`@prisma/adapter-pg`)
- **Queue**: BullMQ
- **Validation**: TypeBox
- **API Docs**: OpenAPI + Scalar

## Prerequisites

- Bun 1.x or higher
- PostgreSQL
- Redis
- Docker (optional)

## Installation

Install dependencies:

```sh
bun install
```

## Configuration

Copy the example environment file and configure your environment variables:

```sh
cp .env.example .env
```

Configure the following environment variables:

- Database connections (PostgreSQL, Redis, ClickHouse)
- Mail settings
- JWT secrets
- Application settings

See [Configuration Documentation](./docs/CONFIGURATION.md) for detailed reference.

## Database Setup

Generate and run PostgreSQL migrations:

```sh
bun run db:generate
bun run db:migrate
```

Seed the database with initial data:

```sh
bun run db:seed
```

For development, you can also use:

```sh
bun run db:push  # Push schema directly without migrations
```

Open Prisma Studio to view and edit data:

```sh
make db-studio
```

Run ClickHouse migrations:

```sh
bun run db:clickhouse:migrate
```

Check ClickHouse migration status:

```sh
bun run db:clickhouse:status
```

## Development

Run the API server in development mode:

```sh
bun run dev
```

The API will be available at http://localhost:3000

## Production

Build the application:

```sh
bun run build
```

Start the production server:

```sh
bun run start
```

## Cluster Mode

The app can run in cluster mode to scale across CPU cores. This is controlled by two environment variables:

- `APP_CLUSTER_MODE` (default `false`) — set to `true` to enable cluster mode.
- `APP_CLUSTER_WORKERS` (default `0`) — number of worker processes to fork. When `0`, falls back to `os.availableParallelism()` (typically the number of available CPU cores).

When enabled, `src/index.ts` runs as the primary process: it forks workers, restarts any worker that exits, and forwards `SIGINT`/`SIGTERM` to all workers for graceful shutdown. Each worker loads `src/server.ts`, which is the actual Elysia app bootstrap.

Example:

```sh
APP_CLUSTER_MODE=true APP_CLUSTER_WORKERS=4 bun run start
```

> **Caveats**
>
> - Every worker re-runs `bootstrap()` and instantiates its own Prisma, Redis, and BullMQ connections. Side-effectful imports (BullMQ workers, scheduled jobs) fire once per worker — if you need single-instance semantics, gate them on `cluster.worker?.id === 1` or run queue workers as a separate process.
> - In-memory state (caches, rate-limit counters not backed by Redis) is **not** shared across workers — keep cross-worker state in Redis.
> - The primary process does not bind the HTTP port; only workers call `.listen()`.

## Docker

Bring up postgres + redis + clickhouse + the app with Docker Compose:

```sh
cp .env.example .env
make docker-up        # compose up -d --build
make docker-migrate   # prisma migrate deploy in a one-off app container
make docker-seed      # seed the database
make docker-logs      # tail app logs
make docker-down      # stop the stack
```

`make docker-deploy` does a full server deploy (`git pull` + rebuild + roll
the stack + migrate). See [docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md) for the
Docker, PM2, and cluster options in full.

## Project Structure

```
src/
├── base.ts                # Base Elysia app with core plugins
├── index.ts               # Cluster entrypoint (forks workers or imports server)
├── server.ts              # Elysia app bootstrap (runs per worker)
├── bull/                  # Background jobs
│   ├── queue/             # Job queues
│   └── worker/            # Job workers
├── libs/                  # Shared libraries
│   ├── cache/             # Cache utilities
│   ├── config/            # Configuration
│   ├── database/          # Database clients and repositories
│   ├── errors/            # Custom error classes
│   ├── guards/            # Authorization guards
│   ├── mailer/            # Email service
│   ├── plugins/           # Elysia plugins
│   ├── repositories/      # Data access layer
│   ├── types/             # TypeScript types
│   └── utils/             # Utility functions
└── modules/               # Feature modules
    ├── auth/              # Authentication
    ├── home/              # Root/health endpoints
    ├── profile/           # User profile
    └── settings/          # Application settings
```

## Code Quality

Run linting:

```sh
bun run lint
```

Fix linting issues:

```sh
bun run lint:fix
```

Format code:

```sh
bun run format
```

Type checking:

```sh
bun run typecheck
```

## API Documentation

Once the server is running, access the interactive API documentation at:

```
http://localhost:3000/docs
```

The API documentation is powered by **OpenAPI** with **Scalar UI**, providing:

- Browse all endpoints with request/response schemas
- Try endpoints directly from the browser
- View validation rules and examples
- Bearer token authentication support

Download the OpenAPI specification:

```
http://localhost:3000/docs/openapi.json
```

For more details, see the [API Documentation Guide](./docs/API_DOCUMENTATION.md).

## Scripts

### Development

- `bun run dev` - Run API server with hot reload
- `bun run build` - Build the application
- `bun run start` - Start the production server

### Code Quality

- `bun run lint` - Run ESLint
- `bun run lint:fix` - Fix ESLint issues
- `bun run format` - Format code with Prettier
- `bun run typecheck` - Run TypeScript type checking

### Database (PostgreSQL/Prisma)

Database commands are Make targets wrapping `bunx --bun prisma` — there are no `db:*` bun scripts
apart from the seeder.

- `make db-generate` - Generate the Prisma client
- `make db-migrate-dev` - Create and apply a migration, then generate (development)
- `make db-migrate` - Apply migrations (`prisma migrate deploy`, production)
- `make db-push` - Push the schema to the database (development only; **force-resets data**)
- `make db-pull` - Pull the schema from the database
- `make db-studio` - Open Prisma Studio
- `make db-drop` - Reset the database (**dangerous — destroys all data**)
- `bun run db:seed` - Seed the database with initial data

### Database (ClickHouse)

- `bun run db:clickhouse:migrate` - Run ClickHouse migrations
- `bun run db:clickhouse:status` - Check migration status

### Docker

- `make docker-build` - Build the compose images
- `make docker-up` - Start the full stack (build if needed)
- `make docker-down` - Stop the stack
- `make docker-restart` - Restart the app container
- `make docker-logs` - Tail app logs
- `make docker-ps` - Show stack status
- `make docker-migrate` - Apply migrations in a one-off app container
- `make docker-seed` - Seed the database in a one-off app container
- `make docker-deploy` - `git pull` + build + up + migrate (server deploy)

### Makefile Commands

You can also use `make` commands:

- `make help` - Show all available commands
- `make dev` - Start development server
- `make fresh` - Drop, push schema, and seed (development)
- `make reset` - Generate migrations, migrate, and seed

## Documentation

Comprehensive documentation is available in the [docs/](./docs/) directory:

- [API Documentation](./docs/API_DOCUMENTATION.md) - API consumer guide
- [Configuration](./docs/CONFIGURATION.md) - Environment variables reference
- [Deployment](./docs/DEPLOYMENT.md) - Docker, PM2, and scaling options
- [Error Handling](./docs/ERROR_HANDLING.md) - Error handling guide
- [Plugins](./docs/PLUGINS.md) - Plugin system guide
- [Security](./docs/SECURITY.md) - Security documentation

## Architecture

This project follows Clean Architecture principles:

### Layers

1. **Modules** - Feature-based modules containing routes and business logic
2. **Repositories** - Data access layer with database operations
3. **Services** - Business logic and orchestration
4. **Plugins** - Cross-cutting concerns (logging, error handling, security)
5. **Utils** - Helper functions and utilities

### Key Patterns

- **Repository Pattern** - Factory functions returning database access methods
- **Service Pattern** - Object exports with business logic methods
- **Plugin Pattern** - Reusable Elysia plugins for middleware
- **Error Handling** - Custom error classes with consistent API responses
- **Validation** - TypeBox schemas for runtime validation

## Roadmap & Improvements

See [TODO.md](./TODO.md) for a comprehensive list of planned improvements and enhancements.

Compare with clean-hono implementation: [COMPARISON.md](../COMPARISON.md)

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

Please read our Contributing Guidelines and Code of Conduct.

## License

This project is licensed under the MIT License.
