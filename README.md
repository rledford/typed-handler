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
