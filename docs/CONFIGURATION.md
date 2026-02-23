# Configuration Documentation

## Overview

The application uses a comprehensive configuration system with:

- **Environment Variables**: Validated with envalid
- **Type Safety**: Strict TypeScript typing for all configs
- **Centralized Management**: All configs in `src/libs/config/`

## Configuration Files

### Environment Variables (`env.config.ts`)

Base environment variable validation using envalid.

**Location**: `src/libs/config/env.config.ts`

### Application Config (`app.config.ts`)

Core application settings.

| Variable         | Type     | Default         | Description                                    |
| ---------------- | -------- | --------------- | ---------------------------------------------- |
| `APP_NAME`       | `string` | `"Elysia APP"`  | Application name                               |
| `APP_PORT`       | `number` | `3000`          | HTTP server port                               |
| `APP_URL`        | `string` | Required        | Public application URL                         |
| `NODE_ENV`       | `string` | `"development"` | Environment (development, staging, production) |
| `APP_TIMEZONE`   | `string` | `"UTC"`         | Application timezone (IANA format)             |
| `APP_KEY`        | `string` | Required        | Application secret key                         |
| `APP_JWT_SECRET` | `string` | Required        | JWT signing secret                             |
| `LOG_LEVEL`      | `string` | `"info"`        | Logging level (info, warn, debug, error)       |
| `CLIENT_URL`     | `string` | Required        | Frontend/client application URL                |

**Example `.env`**:

```bash
NODE_ENV="development"
APP_NAME="Elysia APP"
APP_PORT=3000
APP_URL="http://localhost:3000"
APP_TIMEZONE="UTC"
APP_KEY="your-app-key"
APP_JWT_SECRET="your-jwt-secret"
LOG_LEVEL="info"
CLIENT_URL="http://localhost:3000"
```

### Database Config (`database.config.ts`)

PostgreSQL database configuration.

| Variable       | Type     | Description                  |
| -------------- | -------- | ---------------------------- |
| `DATABASE_URL` | `string` | PostgreSQL connection string |

**Example**:

```bash
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/elysia_db"
```

**Validation Rules**:

- Must be valid URL format
- Must start with `postgres://` or `postgresql://`

### Redis Config (`redis.config.ts`)

Redis cache and queue configuration.

| Variable         | Type     | Default       | Description                 |
| ---------------- | -------- | ------------- | --------------------------- |
| `REDIS_HOST`     | `string` | `"localhost"` | Redis server hostname       |
| `REDIS_PORT`     | `number` | `6379`        | Redis server port           |
| `REDIS_PASSWORD` | `string` | `""`          | Redis password (optional)   |
| `REDIS_DB`       | `number` | `0`           | Redis database index (0-15) |

**Example**:

```bash
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=password123
REDIS_DB=0
```

### ClickHouse Config (`clickhouse.config.ts`)

ClickHouse analytics database configuration.

| Variable              | Type     | Description              |
| --------------------- | -------- | ------------------------ |
| `CLICKHOUSE_HOST`     | `string` | ClickHouse server URL    |
| `CLICKHOUSE_USER`     | `string` | ClickHouse username      |
| `CLICKHOUSE_PASSWORD` | `string` | ClickHouse password      |
| `CLICKHOUSE_DATABASE` | `string` | ClickHouse database name |

**Example**:

```bash
CLICKHOUSE_HOST="http://localhost:8123"
CLICKHOUSE_USER="app"
CLICKHOUSE_PASSWORD="secret"
CLICKHOUSE_DATABASE="app"
```

### Mail Config (`mail.config.ts`)

SMTP mail server configuration.

| Variable      | Type     | Default | Description          |
| ------------- | -------- | ------- | -------------------- |
| `MAIL_HOST`   | `string` | `""`    | SMTP server hostname |
| `MAIL_PORT`   | `number` | `587`   | SMTP server port     |
| `MAIL_SECURE` | `string` | `""`    | Use TLS/SSL          |
| `MAIL_USER`   | `string` | `""`    | SMTP username        |
| `MAIL_PASS`   | `string` | `""`    | SMTP password        |
| `MAIL_FROM`   | `string` | `""`    | Default sender email |

**Example**:

```bash
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_SECURE=false
MAIL_USER=your-email@gmail.com
MAIL_PASS=your-app-password
MAIL_FROM=noreply@yourdomain.com
```

### CORS Config (`cors.config.ts`)

Cross-Origin Resource Sharing configuration.

| Variable       | Type     | Default | Description                       |
| -------------- | -------- | ------- | --------------------------------- |
| `ALLOWED_HOST` | `string` | `"*"`   | Allowed origins (comma-separated) |

**Example**:

```bash
ALLOWED_HOST="http://localhost:3000,https://yourdomain.com"
```

**Production Warning**: Never use `*` for `ALLOWED_HOST` in production.

### JWT Config (`jwt.config.ts`)

JWT authentication configuration.

| Variable         | Type     | Description        |
| ---------------- | -------- | ------------------ |
| `APP_JWT_SECRET` | `string` | JWT signing secret |

## Usage Examples

### Accessing Configuration

```typescript
import { AppConfig, DatabaseConfig } from "@config";

console.log(`Server running on port ${AppConfig.APP_PORT}`);
console.log(`Environment: ${AppConfig.APP_ENV}`);
```

### Conditional Logic Based on Environment

```typescript
import { AppConfig } from "@config";

if (AppConfig.APP_ENV === "production") {
	// Production-specific logic
} else {
	// Development logic
}
```

## Best Practices

### 1. Never Commit Secrets

Use `.env.example` as a template (committed, no secrets) and keep `.env` files git-ignored.

### 2. Use Strong Secrets

```bash
# Generate strong secrets
openssl rand -hex 32
```

### 3. Use Type Imports

```typescript
import { AppConfig } from "@config";
```

### 4. Document New Config Options

When adding new configuration:

1. Add to `env.config.ts` with envalid validation
2. Create/update config file in `src/libs/config/`
3. Update `.env.example`
4. Document in this file

## Troubleshooting

### Configuration Validation Failed

**Symptom**: Application fails to start with configuration errors

**Solution**:

1. Check the error message for specific fields
2. Verify `.env` file has all required variables
3. Ensure values match expected formats
4. Check for typos in variable names

### CORS Issues in Production

**Symptom**: CORS errors in production despite configuration

**Solution**:

1. Never use `*` for `ALLOWED_HOST` in production
2. Set specific domains: `ALLOWED_HOST=https://domain1.com,https://domain2.com`
3. Verify CLIENT_URL is set correctly

### Missing Environment Variables

**Symptom**: Envalid throws errors about missing variables

**Solution**:

1. Copy `.env.example` to `.env`
2. Fill in all required values
3. Restart the application

## Further Reading

- [Envalid Documentation](https://github.com/af/envalid)
- [Environment Variables Best Practices](https://12factor.net/config)
- [CORS Configuration Guide](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS)
