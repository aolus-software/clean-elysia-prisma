# API Documentation Guide

## Introduction

This guide explains how to work with the Clean Elysia API, understand the schema documentation, and integrate with the OpenAPI specification.

## Table of Contents

1. [Getting Started](#getting-started)
2. [OpenAPI/Scalar Documentation](#openapiscalar-documentation)
3. [Understanding Schemas](#understanding-schemas)
4. [Request/Response Examples](#requestresponse-examples)
5. [Validation Rules](#validation-rules)
6. [Error Handling](#error-handling)
7. [Authentication](#authentication)

---

## Getting Started

### Base URL

**Development:**

```
http://localhost:3000
```

**Production:**

```
https://api.example.com
```

### Content Type

All requests and responses use JSON:

```
Content-Type: application/json
```

---

## OpenAPI/Scalar Documentation

### Interactive Documentation

The API provides interactive documentation via Scalar UI:

**Access the docs:**

```
http://localhost:3000/docs
```

**Features:**

- Browse all endpoints
- View request/response schemas
- Try endpoints directly
- See validation rules
- View examples

### OpenAPI Specification

Download the OpenAPI spec:

```
GET /docs/openapi.json
```

**Use cases:**

- Generate client SDKs
- Import into Postman/Insomnia
- Generate documentation
- Validate API contracts

---

## Understanding Schemas

### Schema Structure

Elysia uses TypeBox for schema definitions with comprehensive metadata:

```typescript
import { t } from "elysia";

const EmailSchema = t.String({
	format: "email",
	maxLength: 255,
	description: "Valid email address",
	examples: ["user@example.com"],
});
```

**Components:**

1. **Type**: Base data type (String, Number, Object, etc.)
2. **Validation**: Rules like `format`, `minLength`, `maxLength`
3. **Description**: Field explanation for documentation
4. **Examples**: Real-world usage examples

### Common Schema Patterns

#### Email Field

```json
{
	"email": "user@example.com"
}
```

- **Type**: string
- **Validation**: Valid email format, max 255 characters
- **Example**: "user@example.com"

#### Password Field (Basic)

```json
{
	"password": "MyPassword123!"
}
```

- **Type**: string
- **Validation**: Min 8 chars, max 128 chars
- **Example**: "MyPassword123!"

#### Password Field (Strong)

```json
{
	"password": "SecurePass123!"
}
```

- **Type**: string
- **Validation**:
  - Min 8 characters
  - At least one uppercase letter
  - At least one lowercase letter
  - At least one number
  - At least one special character
- **Example**: "SecurePass123!"

#### UUID Field

```json
{
	"id": "550e8400-e29b-41d4-a716-446655440000"
}
```

- **Type**: string
- **Validation**: Valid UUID v4 format
- **Example**: "550e8400-e29b-41d4-a716-446655440000"

#### Pagination

```json
{
	"page": 1,
	"limit": 10
}
```

- **page**: Positive integer (default: 1)
- **limit**: 1-100 (default: 10)

#### Sorting

```json
{
	"sortBy": "createdAt",
	"sortOrder": "desc"
}
```

- **sortBy**: Field name (optional)
- **sortOrder**: "asc" or "desc" (default: "asc")

---

## Request/Response Examples

### Authentication Endpoints

#### Register User

**Request:**

```http
POST /auth/register
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "SecurePass123!"
}
```

**Success Response (201):**

```json
{
	"success": true,
	"message": "Registration successful. Please check your email to verify your account.",
	"data": null
}
```

**Validation Error (422):**

```json
{
	"success": false,
	"message": "Validation Error",
	"data": null,
	"errors": {
		"email": ["Email is already in use"],
		"password": [
			"Password must contain at least 8 characters, one uppercase, one lowercase, one number and one special character"
		]
	}
}
```

#### Login

**Request:**

```http
POST /auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "SecurePass123!"
}
```

**Success Response (200):**

```json
{
	"success": true,
	"message": "Login successful",
	"data": {
		"user": {
			"id": "550e8400-e29b-41d4-a716-446655440000",
			"name": "John Doe",
			"email": "john@example.com",
			"emailVerifiedAt": "2024-01-15T10:30:00Z",
			"role": {
				"id": "role-uuid",
				"name": "user"
			},
			"createdAt": "2024-01-15T10:30:00Z",
			"updatedAt": "2024-01-15T10:30:00Z"
		},
		"token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
	}
}
```

**Error Response (401):**

```json
{
	"success": false,
	"message": "Invalid credentials",
	"data": null,
	"errors": {
		"email": ["Email not found"],
		"password": ["Incorrect password"]
	}
}
```

### Profile Endpoints

#### Get Profile

**Request:**

```http
GET /profile
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Success Response (200):**

```json
{
	"success": true,
	"message": "User profile retrieved successfully",
	"data": {
		"id": "550e8400-e29b-41d4-a716-446655440000",
		"name": "John Doe",
		"email": "john@example.com",
		"emailVerifiedAt": "2024-01-15T10:30:00Z",
		"role": {
			"id": "role-uuid",
			"name": "user"
		},
		"createdAt": "2024-01-15T10:30:00Z",
		"updatedAt": "2024-01-15T10:30:00Z"
	}
}
```

#### Update Profile

**Request:**

```http
PATCH /profile
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "name": "John Smith",
  "email": "john.smith@example.com"
}
```

**Success Response (200):**

```json
{
	"success": true,
	"message": "User profile updated successfully",
	"data": {
		"id": "550e8400-e29b-41d4-a716-446655440000",
		"name": "John Smith",
		"email": "john.smith@example.com",
		"emailVerifiedAt": "2024-01-15T10:30:00Z",
		"role": {
			"id": "role-uuid",
			"name": "user"
		},
		"createdAt": "2024-01-15T10:30:00Z",
		"updatedAt": "2024-01-16T14:20:00Z"
	}
}
```

---

## Validation Rules

### Field-Level Validation

Each field has specific validation rules documented in the schema:

| Field               | Rules                             | Example               |
| ------------------- | --------------------------------- | --------------------- |
| **email**           | Valid email format, max 255 chars | user@example.com      |
| **password**        | Min 8 chars, max 128 chars        | MyPass123!            |
| **strong_password** | Min 8 chars + complexity          | Secure123!            |
| **name**            | Min 1 char, max 255 chars         | John Doe              |
| **uuid**            | Valid UUID v4 format              | 550e8400-e29b-41d4... |
| **token**           | Min 10 chars                      | eyJhbGciOiJI...       |

### Query Parameter Validation

**Pagination:**

- `page`: Positive integer (default: 1)
- `limit`: 1-100 (default: 10)

**Sorting:**

- `sortBy`: Field name (optional)
- `sortOrder`: "asc" | "desc" (default: "asc")

**Search:**

- `q` or `search`: Min 1 char when provided

---

## Error Handling

### Error Response Structure

All errors follow a consistent structure:

```json
{
	"success": false,
	"message": "Error message",
	"data": null,
	"errors": {}
}
```

### HTTP Status Codes

| Code    | Meaning               | When It Occurs                    |
| ------- | --------------------- | --------------------------------- |
| **200** | OK                    | Successful request                |
| **201** | Created               | Resource created successfully     |
| **400** | Bad Request           | Invalid request format            |
| **401** | Unauthorized          | Missing or invalid authentication |
| **403** | Forbidden             | Insufficient permissions          |
| **404** | Not Found             | Resource not found                |
| **422** | Unprocessable Entity  | Validation errors                 |
| **429** | Too Many Requests     | Rate limit exceeded               |
| **500** | Internal Server Error | Server error                      |

### Validation Errors (422)

Validation errors include detailed field-level error messages:

```json
{
	"success": false,
	"message": "Validation Error",
	"data": null,
	"errors": {
		"email": ["Must be a valid email address"],
		"password": ["Password must be at least 8 characters"]
	}
}
```

---

## Authentication

### Obtaining Tokens

1. **Register** (if new user)
2. **Verify email** (check inbox)
3. **Login** to receive JWT token

### Using Tokens

Include JWT in Authorization header:

```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Token Expiration

- Access tokens expire after 24 hours (default)
- Implement token refresh logic
- Handle 401 responses by redirecting to login

### Security Best Practices

1. **Store tokens securely** (httpOnly cookies or secure storage)
2. **Use HTTPS** in production
3. **Never expose tokens in URLs**
4. **Clear tokens on logout**
5. **Implement token refresh**

---

## SDK Generation

Generate client SDKs from OpenAPI spec:

### TypeScript/JavaScript

```bash
npx openapi-typescript-codegen --input openapi.json --output ./client
```

### Python

```bash
openapi-generator-cli generate -i openapi.json -g python -o ./client
```

### Other Languages

- Java
- Go
- Ruby
- PHP
- C#

Visit [OpenAPI Generator](https://openapi-generator.tech/) for more options.

---

## Testing the API

### Using cURL

```bash
# Register
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"John Doe","email":"john@example.com","password":"SecurePass123!"}'

# Login
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"john@example.com","password":"SecurePass123!"}'

# Get Profile (with token)
curl -X GET http://localhost:3000/profile \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Using Postman

1. Import OpenAPI spec from `/docs/openapi.json`
2. Set up environment variables for base URL and token
3. Use collection runner for automated testing

### Using the Interactive Docs

Visit `http://localhost:3000/docs` and:

1. Browse endpoints
2. Click "Try it out"
3. Fill in parameters
4. Execute request
5. View response

---

## Support

For API questions and support:

- **Documentation**: This guide and `/docs`
- **OpenAPI Spec**: `/docs/openapi.json`
- **Security**: See `SECURITY.md`
- **Issues**: GitHub Issues

---

**Last Updated**: February 2026
**Version**: 1.0.0
