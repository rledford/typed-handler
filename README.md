# typed-handler

A TypeScript library that provides a fluent, type-safe API for building request handlers with automatic validation and framework-agnostic design.

## Features

- **Type-Safe**: Full TypeScript type inference throughout the handler chain
- **Validator-Agnostic**: Works with Zod, Joi, Yup, or custom validators
- **Framework-Agnostic**: Adapters for Express, Fastify, Hono, and more
- **Fluent API**: Clean, chainable interface
- **Context Flow**: Type-safe context passing through middleware
- **Flexible Validation**: Support for runtime validation or type-only mode
- **Minimal Dependencies**: Core library has zero dependencies

## Why typed-handler?

### Developer Experience

typed-handler provides a consistent, fluent API that reduces cognitive load and accelerates development. The type-safe builder pattern guides you through handler construction with full IntelliSense support, making it easy to build correct handlers the first time. Automatic type inference eliminates manual type annotations, reducing boilerplate while maintaining complete type safety throughout your application.

### Cross-Platform Consistency

Build handler logic once and deploy it anywhere. The framework-agnostic design means your core business logic remains unchanged whether you're building Express APIs, Fastify services, or processing events in a serverless function. The raw adapter extends this consistency to non-HTTP contexts like CLI tools, batch jobs, and background workers, ensuring your team uses the same patterns across all application types.

### Testing Benefits

Type-safe handlers make testing straightforward and reliable. Mock external services with the same type guarantees as production code, generate test fixtures with automatic validation, and write integration tests that catch type mismatches at compile time. The raw adapter enables direct handler testing without framework overhead, making unit tests faster and more focused on business logic.

### Operational Benefits

Runtime validation catches data integrity issues before they cascade through your system, while structured error handling provides consistent, actionable error responses. Middleware composition enables cross-cutting concerns like logging, metrics, and authentication to be applied consistently across handlers. In production, optional output validation provides an extra safety net during deployments and data migrations.

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
  .output(z.object({ id: z.string(), name: z.string(), email: z.string() }));

// Use with Express
app.post('/users', createUser.express());

// Use with Fastify
fastify.post('/users', createUser.fastify());

// Use with Hono
app.post('/users', createUser.hono());
```

## Beyond Web APIs

While typed-handler excels at building web APIs, its framework-agnostic design makes it valuable for many other application types. The `raw` adapter allows you to use typed-handler's structured data processing, validation, and type inference in any context.

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

### Use Cases

- **[Event Processing Systems](./docs/use-cases/event-processing.md)** - Handle domain events and integrate with event buses
- **[CLI Tools and Scripts](./docs/use-cases/cli-tools.md)** - Process command-line arguments with validation
- **[Batch Processing Jobs](./docs/use-cases/batch-jobs.md)** - Transform data through multi-stage pipelines
- **[Function-as-a-Service](./docs/use-cases/faas.md)** - Build serverless functions for AWS Lambda, Cloudflare Workers, etc.
- **[Testing and Mocking](./docs/use-cases/testing.md)** - Generate test fixtures and mock services
- **[GraphQL Resolvers](./docs/use-cases/graphql.md)** - Create type-safe resolvers with validation
- **[Background Job Processing](./docs/use-cases/background-jobs.md)** - Process queue messages and streams

See the [use cases documentation](./docs/use-cases/) for detailed examples and patterns.

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
