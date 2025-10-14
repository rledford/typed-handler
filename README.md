# typed-handler

A TypeScript library for building type-safe operations with automatic validation and context management. Works with any validation library (Zod, Yup, Joi) and any runtime environment (Express, Fastify, event processors, CLI tools, batch jobs). The core library has zero runtime dependencies.

[![npm version](https://badge.fury.io/js/typed-handler.svg)](https://www.npmjs.com/package/typed-handler)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Requirements](#requirements)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [Use Cases](#use-cases)
- [Using Outside Web Frameworks](#using-outside-web-frameworks)
- [Similar Projects](#similar-projects)
- [Development Setup](#development-setup)
- [Documentation](#documentation)

## Overview

typed-handler provides a fluent API for creating validated handlers where types are automatically inferred from your validation schemas. Define your input schema once and get end-to-end type safety without manual type annotations.

```typescript
import { handler } from 'typed-handler';
import { z } from 'zod';

// Minimal handler - just input validation and logic
const greet = handler()
  .input(z.object({ name: z.string() }))
  .handle(async ({ name }) => ({ message: `Hello, ${name}!` }));

const result = await greet.execute({ name: 'World' });
// result is typed as { message: string }

// Add output validation
const greetWithOutput = handler()
  .input(z.object({ name: z.string() }))
  .handle(async ({ name }) => ({ message: `Hello, ${name}!` }))
  .output(z.object({ message: z.string() }));

// Full chain with transform and output validation
const greetWithMetadata = greet
  .transform((result) => ({ ...result, timestamp: new Date().toISOString() }))
  .output(z.object({ message: z.string(), timestamp: z.string() }));
```

## Features

- **Automatic Type Inference** - Types flow from validation schemas to handlers without manual annotations
- **Validator-Agnostic** - Works with Zod, Joi, Yup, or custom validators
- **Runtime-Agnostic** - Same handler code works in Express, Fastify, Hono, GraphQL resolvers, CLI tools, event processors
- **Type-Safe Context** - Pass dependencies (db, logger, auth) through the handler chain with full type inference
- **Fluent API** - Chainable interface for building handlers
- **Zero Dependencies** - Core library has zero runtime dependencies
- **Well-Tested** - 90%+ test coverage

## Use Cases

typed-handler works in any environment where you need validated, type-safe data processing:

- **Web APIs** - Express, Fastify, Hono routes with automatic request validation
- **GraphQL** - Type-safe resolvers with input validation
- **Event Processing** - Handle domain events and message queue processing
- **Serverless Functions** - AWS Lambda, Cloudflare Workers, Vercel functions
- **CLI Tools** - Process command-line arguments with validation
- **Batch Jobs** - Transform data through multi-stage pipelines
- **Background Workers** - Process queue messages with type safety

The framework-agnostic design means you write your handler logic once and use it anywhere.

## Requirements

- Node.js 18+
- TypeScript 5.0+

## Installation

```bash
npm install typed-handler
# or
pnpm add typed-handler
# or
yarn add typed-handler
```

## Quick Start

```typescript
import { handler } from 'typed-handler';
import { z } from 'zod';

const createUser = handler()
  .input(z.object({ name: z.string(), email: z.string().email() }))
  .handle(async (input) => {
    const user = await db.users.create(input);
    return user;
  })
  .transform((user) => ({
    success: true,
    data: user,
    timestamp: new Date().toISOString(),
  }))
  .output(z.object({
    success: z.boolean(),
    data: z.object({ id: z.string(), name: z.string(), email: z.string() }),
    timestamp: z.string(),
  }));

// Use with Express
app.post('/users', createUser.express());

// Use with Fastify
fastify.post('/users', createUser.fastify());

// Use with Hono
app.post('/users', createUser.hono());
```

## Using Outside Web Frameworks

The `raw` adapter allows you to use handlers in any environment without framework-specific integration.

```typescript
import { handler, raw } from 'typed-handler';

const processData = handler()
  .input(schema)
  .use(async () => ({ logger, db }))
  .handle(async (input, ctx) => {
    // Your business logic
    return result;
  });

const execute = raw(processData);
const result = await execute(data);
```

See the [use cases documentation](./docs/use-cases/) for detailed examples and patterns including event processing, CLI tools, batch jobs, serverless functions, testing utilities, GraphQL resolvers, and background job processing.

## Similar Projects

- **tRPC** - End-to-end typesafe APIs, tightly coupled to frontend/backend architecture
- **Fastify Type Providers** - Framework-specific type safety for Fastify
- **express-validator** - Express-specific validation without automatic type inference

typed-handler focuses on portability and flexibility - use any validator, any framework, with full type inference throughout your handler chain.

## Development Setup

This project is set up with modern, fast tooling for efficient development.

### Prerequisites

- Node.js 18+ (recommended: 20+)
- pnpm 8+

### Getting Started

```bash
# Install dependencies
pnpm install

# Set up git hooks
pnpm prepare

# Run development server
pnpm dev

# Run tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Build the library
pnpm build

# Lint code
pnpm lint

# Format code
pnpm format
```

### Using Docker

```bash
# Development with hot reload
docker-compose up dev

# Run tests
docker-compose up test

# Build
docker-compose up build

# Type check
docker-compose up type-check
```

## Project Structure

```
typed-handler/
├── src/                    # Source code
│   ├── index.ts           # Main exports
│   ├── handler.ts         # Handler class
│   ├── types.ts           # Core types
│   ├── config.ts          # Configuration
│   ├── validators/        # Validator system
│   ├── adapters/          # Framework adapters
│   ├── errors/            # Error classes
│   └── utils/             # Utilities
├── tests/                 # Test files
│   ├── unit/             # Unit tests
│   ├── integration/      # Integration tests
│   └── types/            # Type tests
├── examples/             # Usage examples
└── docs/                 # Documentation
```

## Contributing

Contributions are welcome! Please read our contributing guidelines before submitting PRs.

## License

MIT

## Documentation

For full documentation, see [docs/](./docs/).

## Status

🚧 This project is currently in development. The API may change before the 1.0 release.

---

**Keywords**: typescript, validation, zod, joi, yup, express, fastify, hono, type-safe, type-inference, request-handler, middleware, api, rest, graphql, serverless, lambda, event-driven, cli, batch-processing
