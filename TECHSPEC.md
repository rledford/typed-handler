# Technical Specification: typed-handler

**Version:** 1.0.0  
**Date:** October 12, 2025  
**Status:** Draft

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Project Overview](#project-overview)
3. [Design Goals](#design-goals)
4. [Architecture](#architecture)
5. [API Design](#api-design)
6. [Type System](#type-system)
7. [Validator System](#validator-system)
8. [Framework Adapters](#framework-adapters)
9. [Error Handling](#error-handling)
10. [Configuration](#configuration)
11. [Implementation Details](#implementation-details)
12. [Testing Strategy](#testing-strategy)
13. [Package Structure](#package-structure)
14. [Usage Examples](#usage-examples)
15. [Performance Considerations](#performance-considerations)
16. [Future Enhancements](#future-enhancements)

---

## Executive Summary

`typed-handler` is a TypeScript library that provides a fluent, type-safe API for building request handlers with automatic validation and framework-agnostic design. It allows developers to create handlers that work with any validation library (Zod, Joi, Yup, etc.) and any web framework (Express, Fastify, Hono, etc.).

### Key Features

- **Type-Safe**: Full TypeScript type inference throughout the handler chain
- **Validator-Agnostic**: Works with Zod, Joi, Yup, or custom validators
- **Framework-Agnostic**: Adapters for Express, Fastify, Hono, and more
- **Fluent API**: Clean, chainable interface
- **Context Flow**: Type-safe context passing through middleware
- **Flexible Validation**: Support for runtime validation or type-only mode
- **Minimal Dependencies**: Core library has zero dependencies

---

## Project Overview

### Problem Statement

Modern web APIs require:
1. Type safety at compile time
2. Runtime validation of inputs and outputs
3. Consistent error handling
4. Framework flexibility
5. Minimal boilerplate

Existing solutions either:
- Lock you into a specific framework (NestJS)
- Lock you into a specific validator (tRPC with Zod)
- Require significant boilerplate (vanilla Express)
- Are too opinionated about architecture

### Solution

A lightweight library that:
- Provides structure without dictating architecture
- Works with any validation library
- Integrates with any web framework
- Maintains full TypeScript type safety
- Allows incremental adoption

### Target Audience

1. Teams using vanilla Express who want more structure
2. Projects with existing validation libraries they can't change
3. Microservices needing consistent patterns across services
4. Developers who want NestJS-level structure with Express-level simplicity
5. Teams building framework-agnostic shared libraries

---

## Design Goals

### Primary Goals

1. **Type Safety First**: All types should be inferred automatically without manual annotations
2. **Zero Vendor Lock-in**: Support any validator, any framework
3. **Developer Experience**: API should be intuitive and discoverable
4. **Production Ready**: Handle edge cases, provide clear errors, support debugging
5. **Performance**: Minimal overhead, optional validation skipping

### Non-Goals

1. Not a full framework (no routing, auth, ORM)
2. Not a replacement for frameworks like NestJS
3. Not opinionated about project structure
4. Not trying to solve every edge case (provide escape hatches)

### Design Principles

1. **Composition over Configuration**: Build handlers by chaining methods
2. **Progressive Enhancement**: Start simple, add features as needed
3. **Immutability**: Each method returns a new handler instance
4. **Explicit over Implicit**: Make behavior clear and predictable
5. **Escape Hatches**: Always provide raw access when needed

---

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        User Code                            │
│  handler().input(schema).handle(fn).output(schema)          │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Handler Builder                          │
│  - input(), handle(), output(), use()                       │
│  - Immutable chain construction                             │
│  - Type inference at each step                              │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   Validator System                          │
│  - Auto-detection of validator libraries                    │
│  - Built-in adapters (Zod, Joi, Yup)                        │
│  - Custom adapter registration                              │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                  Execution Engine                           │
│  1. Extract input from request                              │
│  2. Validate input (if configured)                          │
│  3. Run middleware chain (build context)                    │
│  4. Execute handler function                                │
│  5. Transform output (if defined)                           │
│  6. Validate output (if configured)                         │
│  7. Return result                                           │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                 Framework Adapters                          │
│  - Express adapter                                          │
│  - Fastify adapter                                          │
│  - Hono adapter                                             │
│  - Raw adapter (custom integration)                         │
└─────────────────────────────────────────────────────────────┘
```

### Core Components

1. **Handler Class**: Main builder class that constructs the handler chain
2. **Validator System**: Detects and adapts validation libraries
3. **Execution Engine**: Runs the handler with validation and middleware
4. **Framework Adapters**: Integrate with web frameworks
5. **Type System**: TypeScript types for inference
6. **Configuration**: Global and per-handler configuration
7. **Logger Interface**: Pluggable logging system

---

## API Design

### Basic Handler Creation

```typescript
import { handler } from 'typed-handler';
import { z } from 'zod';

const createUser = handler()
  .input(z.object({ name: z.string() }))
  .handle(async (input) => {
    return { id: '1', ...input };
  })
  .output(z.object({ id: z.string(), name: z.string() }));
```

### Method Signature Overview

```typescript
class Handler<TInput, TContext, TOutput> {
  // Input validation
  input<T>(schema: unknown, adapter?: ValidatorAdapter<T>): Handler<InferInput<typeof schema>, TContext, TOutput>;
  input<T>(): Handler<T, TContext, TOutput>; // Type-only mode
  
  // Middleware
  use<TNewContext>(middleware: Middleware<TContext, TNewContext>): Handler<TInput, TContext & TNewContext, TOutput>;
  
  // Handler function
  handle<TOut>(fn: HandlerFunction<TInput, TContext, TOut>): Handler<TInput, TContext, TOut>;

  // Transform stage
  transform<TTransformed>(fn: TransformFunction<TContext, TOutput, TTransformed>): Handler<TInput, TContext, TTransformed>;

  // Output validation
  output<T>(schema: unknown, adapter?: ValidatorAdapter<T>): Handler<TInput, TContext, InferOutput<typeof schema>>;
  output<T>(): Handler<TInput, TContext, T>; // Type-only mode

  // Execution
  execute(input: unknown, context?: Partial<TContext>): Promise<TOutput>;
  
  // Framework adapters
  express(): ExpressHandler;
  fastify(): FastifyHandler;
  hono(): HonoHandler;
  raw(): RawHandler<TInput, TContext, TOutput>;
}
```

### Factory Function

```typescript
function handler<TContext = {}>(config?: Partial<HandlerConfig>): Handler<unknown, TContext, unknown>;
```

### Multiple Input Sources

```typescript
// Object-based multi-input
const handler1 = handler()
  .input({
    body: BodySchema,
    query: QuerySchema,
    params: ParamsSchema,
    headers: HeadersSchema,
  })
  .handle(async ({ body, query, params, headers }) => {
    // All typed correctly
  });
```

### Context Flow

```typescript
const handler2 = handler()
  .use(async (req) => {
    return { user: await getUser(req) };
  })
  .use(async (req, ctx) => {
    // ctx.user is available
    return { org: await getOrg(ctx.user.orgId) };
  })
  .input(Schema)
  .handle(async (input, ctx) => {
    // ctx.user and ctx.org both available and typed
  });
```

### Type-Only Mode

```typescript
// No runtime validation
const handler3 = handler()
  .input<{ id: string }>()
  .handle(async (input) => {
    return { success: true };
  })
  .output<{ success: boolean }>();
```

---

## Type System

### Core Type Definitions

```typescript
// Handler function type
export type HandlerFunction<TInput, TContext, TOutput> = (
  input: TInput,
  context: TContext
) => Promise<TOutput> | TOutput;

// Middleware type
export type Middleware<TContext, TNewContext = {}> = (
  req: unknown,
  context: TContext
) => Promise<TNewContext> | TNewContext;

// Transform function type
export type TransformFunction<TContext, TInput, TOutput> = (
  data: TInput,
  context: TContext
) => Promise<TOutput> | TOutput;

// Validator adapter type
export interface ValidatorAdapter<T> {
  parse: (schema: unknown, data: unknown) => Promise<T> | T;
  detect?: (schema: unknown) => boolean;
}

// Multi-input type
export type MultiInput<T> = {
  body?: T;
  query?: T;
  params?: T;
  headers?: T;
};
```

### Type Inference

```typescript
// Infer input type from validator schema
export type InferInput<V> = 
  V extends ZodType<infer T> ? T :
  V extends { parse(data: unknown): infer T } ? T :
  V extends { validate(data: unknown): { value: infer T } } ? T :
  V extends { validateSync(data: unknown): infer T } ? T :
  never;

// Infer output type (same as input)
export type InferOutput<V> = InferInput<V>;

// Handle multi-input objects
export type ExtractedInput<T> = T extends MultiInput<any>
  ? {
      [K in keyof T]: T[K] extends unknown ? InferInput<T[K]> : never;
    }
  : InferInput<T>;

// Context merging
export type MergeContext<TContext, TNewContext> = TContext & TNewContext;
```

### Type Safety Guarantees

1. **Input Typing**: Input type is inferred from schema or explicit type parameter
2. **Context Typing**: Context accumulates types through middleware chain
3. **Output Typing**: Output type is inferred from schema or explicit type parameter
4. **Handler Typing**: Handler function receives correctly typed input and context
5. **Chain Typing**: Each method in the chain returns a handler with updated types

---

## Validator System

### Built-in Adapters

#### Zod Adapter

```typescript
{
  name: 'zod',
  detect: (schema) => 
    schema && typeof schema === 'object' && '_def' in schema && 'parse' in schema,
  parse: async (schema, data) => {
    // Use parseAsync for consistency
    return await schema.parseAsync(data);
  },
}
```

#### Joi Adapter

```typescript
{
  name: 'joi',
  detect: (schema) => 
    schema && typeof schema === 'object' && 'validate' in schema && schema.isJoi === true,
  parse: async (schema, data) => {
    const result = await schema.validateAsync(data);
    return result;
  },
}
```

#### Yup Adapter

```typescript
{
  name: 'yup',
  detect: (schema) => 
    schema && typeof schema === 'object' && '__isYupSchema__' in schema,
  parse: async (schema, data) => {
    return await schema.validate(data, { abortEarly: false });
  },
}
```

### Adapter Registration

```typescript
// Global adapter registration
import { registerAdapter } from 'typed-handler';

registerAdapter({
  name: 'custom',
  detect: (schema) => schema?.constructor?.name === 'CustomValidator',
  parse: async (schema, data) => schema.validate(data),
});

// Per-handler adapter
const handler1 = handler()
  .input(customSchema, {
    parse: async (schema, data) => schema.validate(data),
  });
```

### Auto-Detection Algorithm

```typescript
function detectValidator(schema: unknown): ValidatorAdapter<any> | null {
  // Check all registered adapters in order
  for (const adapter of registeredAdapters) {
    if (adapter.detect && adapter.detect(schema)) {
      return adapter;
    }
  }
  return null;
}
```

### Validation Flow

```
Input Data
    │
    ▼
┌─────────────────────┐
│ Check if validation │
│ is enabled          │
└─────────────────────┘
    │
    ├─ No  → Return data as-is
    │
    └─ Yes
        │
        ▼
┌─────────────────────┐
│ Custom adapter      │
│ provided?           │
└─────────────────────┘
    │
    ├─ Yes → Use custom adapter
    │
    └─ No
        │
        ▼
┌─────────────────────┐
│ Auto-detect         │
│ validator           │
└─────────────────────┘
    │
    ├─ Found → Use detected adapter
    │
    └─ Not Found → Log warning, return data
```

---

## Framework Adapters

### Express Adapter

```typescript
export function toExpress<TInput, TContext, TOutput>(
  handler: Handler<TInput, TContext, TOutput>
): (req: Request, res: Response, next: NextFunction) => Promise<void> {
  return async (req, res, next) => {
    try {
      // Detect if handler expects multi-input
      const input = handler.expectsMultiInput()
        ? {
            body: req.body,
            query: req.query,
            params: req.params,
            headers: req.headers,
          }
        : req.body;

      // Execute handler with request context
      const result = await handler.execute(input, { req, res });

      // Handle response format
      if (isResponseObject(result)) {
        res.status(result.status).json(result.body);
      } else {
        res.json(result);
      }
    } catch (error) {
      next(error);
    }
  };
}
```

### Fastify Adapter

```typescript
export function toFastify<TInput, TContext, TOutput>(
  handler: Handler<TInput, TContext, TOutput>
): FastifyHandler {
  return async (request, reply) => {
    const input = handler.expectsMultiInput()
      ? {
          body: request.body,
          query: request.query,
          params: request.params,
          headers: request.headers,
        }
      : request.body;

    const result = await handler.execute(input, { request, reply });

    if (isResponseObject(result)) {
      return reply.status(result.status).send(result.body);
    }
    return result;
  };
}
```

### Hono Adapter

```typescript
export function toHono<TInput, TContext, TOutput>(
  handler: Handler<TInput, TContext, TOutput>
): HonoHandler {
  return async (c) => {
    const input = handler.expectsMultiInput()
      ? {
          body: await c.req.json(),
          query: c.req.query(),
          params: c.req.param(),
          headers: Object.fromEntries(c.req.header()),
        }
      : await c.req.json();

    const result = await handler.execute(input, { c });

    if (isResponseObject(result)) {
      return c.json(result.body, result.status);
    }
    return c.json(result);
  };
}
```

### Raw Adapter

```typescript
export interface RawHandler<TInput, TContext, TOutput> {
  execute(input: TInput, context?: Partial<TContext>): Promise<TOutput>;
}

export function toRaw<TInput, TContext, TOutput>(
  handler: Handler<TInput, TContext, TOutput>
): RawHandler<TInput, TContext, TOutput> {
  return {
    execute: (input, context) => handler.execute(input, context),
  };
}
```

### Response Object Format

```typescript
export interface ResponseObject<T = unknown> {
  status: number;
  body: T;
  headers?: Record<string, string>;
}

export function isResponseObject(obj: unknown): obj is ResponseObject {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'status' in obj &&
    'body' in obj
  );
}
```

---

## Error Handling

### Built-in Error Classes

```typescript
// Validation error
export class ValidationError extends Error {
  constructor(
    message: string,
    public readonly field?: string,
    public readonly value?: unknown,
    public readonly originalError?: unknown
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

// General handler error
export class HandlerError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number = 500,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = 'HandlerError';
  }
}
```

### Error Flow

```
Handler Execution
    │
    ▼
Try:
  Input Validation
  Middleware Chain
  Handler Function
  Output Validation
    │
    ▼
Catch Error
    │
    ▼
┌────────────────────┐
│ ValidationError?   │
└────────────────────┘
    │
    ├─ Yes → Log + Re-throw
    │
    └─ No
        │
        ▼
┌────────────────────┐
│ HandlerError?      │
└────────────────────┘
    │
    ├─ Yes → Log + Re-throw
    │
    └─ No → Log + Re-throw as HandlerError
```

### Error Handling in Adapters

Framework adapters should:
1. Catch all errors from handler execution
2. Pass errors to framework's error handling (Express: `next(error)`)
3. Or handle errors directly (Fastify, Hono)

Users provide error handling via:
1. Framework middleware (Express)
2. Error handlers (Fastify)
3. Error boundaries (Hono)

### Validation Error Wrapping

```typescript
private async validateInput(data: unknown): Promise<TInput> {
  try {
    // ... validation logic
  } catch (error) {
    this.config.logger.error('Input validation failed', {
      error,
      data,
    });
    
    throw new ValidationError(
      'Input validation failed',
      undefined,
      error
    );
  }
}
```

---

## Configuration

### Configuration Interface

```typescript
export interface Logger {
  error(message: string, meta?: unknown): void;
  warn(message: string, meta?: unknown): void;
  info(message: string, meta?: unknown): void;
  debug(message: string, meta?: unknown): void;
}

export interface HandlerConfig {
  // Validation behavior
  validateInput: boolean;
  validateOutput: boolean;
  
  // Logging
  logger: Logger;
}
```

### Global Configuration

```typescript
import { configure } from 'typed-handler';

configure({
  validateInput: true,
  validateOutput: process.env.NODE_ENV !== 'production',
  logger: {
    error: (msg, meta) => console.error(msg, meta),
    warn: (msg, meta) => console.warn(msg, meta),
    info: (msg, meta) => console.log(msg, meta),
    debug: (msg, meta) => console.debug(msg, meta),
  },
});
```

### Per-Handler Configuration

```typescript
const handler1 = handler({
  validateOutput: false, // Skip output validation for this handler
  logger: customLogger,
});
```

### Default Configuration

```typescript
const defaultConfig: HandlerConfig = {
  validateInput: true,
  validateOutput: process.env.NODE_ENV !== 'production',
  logger: {
    error: () => {},
    warn: () => {},
    info: () => {},
    debug: () => {},
  },
};
```

### No-Op Logger

The default logger is a no-op logger (all methods do nothing). This eliminates the need for conditional checks throughout the codebase:

```typescript
// Always safe to call
this.config.logger.error('message', meta);

// No need for:
if (this.config.logger) {
  this.config.logger.error('message', meta);
}
```

### Integration with Popular Loggers

```typescript
// Pino
import pino from 'pino';
configure({ logger: pino() });

// Winston
import winston from 'winston';
configure({ 
  logger: {
    error: (msg, meta) => winston.error(msg, meta),
    warn: (msg, meta) => winston.warn(msg, meta),
    info: (msg, meta) => winston.info(msg, meta),
    debug: (msg, meta) => winston.debug(msg, meta),
  }
});

// Console (development)
configure({
  logger: {
    error: (msg, meta) => console.error(msg, meta),
    warn: (msg, meta) => console.warn(msg, meta),
    info: (msg, meta) => console.log(msg, meta),
    debug: (msg, meta) => console.debug(msg, meta),
  },
});
```

---

## Implementation Details

### Handler Class Structure

```typescript
export class Handler<TInput = unknown, TContext = {}, TOutput = unknown> {
  private inputValidator?: {
    schema: unknown;
    adapter?: ValidatorAdapter<any>;
    isMultiInput: boolean;
  };

  private outputValidator?: {
    schema: unknown;
    adapter?: ValidatorAdapter<any>;
  };

  private middlewares: Middleware<any, any>[] = [];
  private handlerFn?: HandlerFunction<TInput, TContext, TOutput>;
  private transformFn?: TransformFunction<TContext, TOutput, unknown>;
  private config: HandlerConfig;

  constructor(config?: Partial<HandlerConfig>) {
    this.config = { ...getConfig(), ...config };
  }

  // Builder methods...
  
  // Clone for immutability
  private clone(): Handler<TInput, TContext, TOutput> {
    const newHandler = new Handler<TInput, TContext, TOutput>(this.config);
    newHandler.inputValidator = this.inputValidator;
    newHandler.outputValidator = this.outputValidator;
    newHandler.middlewares = [...this.middlewares];
    newHandler.handlerFn = this.handlerFn;
    newHandler.transformFn = this.transformFn;
    return newHandler;
  }
}
```

### Immutability Pattern

Each builder method:
1. Clones the current handler
2. Modifies the clone
3. Returns the clone

This ensures:
- Original handler is unchanged
- Handlers can be reused and composed
- No unexpected mutations

```typescript
input<T>(schema: unknown): Handler<T, TContext, TOutput> {
  const newHandler = this.clone();
  newHandler.inputValidator = { schema };
  return newHandler as any;
}
```

### Execution Flow

```typescript
async execute(rawInput: unknown, initialContext?: Partial<TContext>): Promise<TOutput> {
  try {
    // 1. Validate input
    const input = this.config.validateInput && this.inputValidator
      ? await this.validateInput(rawInput)
      : rawInput as TInput;

    // 2. Build context through middleware
    let context: TContext = { ...initialContext } as TContext;
    for (const middleware of this.middlewares) {
      const newContext = await middleware(rawInput, context);
      context = { ...context, ...newContext };
    }

    // 3. Execute handler
    if (!this.handlerFn) {
      throw new Error('Handler function not defined');
    }
    const output = await this.handlerFn(input, context);

    // 4. Transform output (if defined)
    const transformedOutput = this.transformFn
      ? await this.transformFn(output, context)
      : output;

    // 5. Validate output
    if (this.config.validateOutput && this.outputValidator) {
      return await this.validateOutput(transformedOutput);
    }

    return transformedOutput;
  } catch (error) {
    this.config.logger.error('Handler execution error', { error });
    throw error;
  }
}
```

### Multi-Input Detection

```typescript
expectsMultiInput(): boolean {
  return this.inputValidator?.isMultiInput ?? false;
}

private detectMultiInput(schema: unknown): boolean {
  return (
    typeof schema === 'object' &&
    schema !== null &&
    ('body' in schema || 'query' in schema || 'params' in schema || 'headers' in schema)
  );
}
```

---

## Testing Strategy

### Unit Tests

**Core Handler Tests**
- Handler creation and chaining
- Type inference (compile-time checks)
- Immutability of handler chain
- Configuration inheritance

**Validator Tests**
- Auto-detection for Zod, Joi, Yup
- Custom adapter registration
- Validation success and failure cases
- Type-only mode (no validation)

**Execution Tests**
- Input validation
- Middleware execution and context building
- Handler function execution
- Output validation
- Error propagation

**Adapter Tests**
- Express adapter integration
- Fastify adapter integration
- Hono adapter integration
- Raw adapter usage

### Integration Tests

**End-to-End Tests**
- Complete handler with validation
- Multi-input handling
- Context flow through middleware
- Error handling across layers

**Framework Integration Tests**
- Create actual Express/Fastify/Hono servers
- Test with real HTTP requests
- Verify request/response flow
- Test error handling in frameworks

### Type Tests

Use `tsd` or similar for compile-time type testing:

```typescript
import { expectType } from 'tsd';
import { handler } from 'typed-handler';
import { z } from 'zod';

const h = handler()
  .input(z.object({ name: z.string() }))
  .handle(async (input) => {
    expectType<{ name: string }>(input);
    return { id: '1', name: input.name };
  })
  .output(z.object({ id: z.string(), name: z.string() }));

expectType<{ id: string; name: string }>(await h.execute({ name: 'test' }));
```

### Test Coverage Goals

- Unit tests: >90% coverage
- Integration tests: All major paths
- Type tests: All type inference scenarios

---

## Package Structure

```
typed-handler/
├── src/
│   ├── index.ts                 # Main exports
│   ├── handler.ts               # Handler class
│   ├── types.ts                 # Core types
│   ├── config.ts                # Configuration
│   │
│   ├── validators/
│   │   ├── index.ts             # Validator exports
│   │   ├── adapters.ts          # Built-in adapters
│   │   ├── detector.ts          # Auto-detection
│   │   ├── registry.ts          # Custom adapter registration
│   │   └── types.ts             # Validator types
│   │
│   ├── adapters/
│   │   ├── index.ts             # Adapter exports
│   │   ├── express.ts           # Express adapter
│   │   ├── fastify.ts           # Fastify adapter
│   │   ├── hono.ts              # Hono adapter
│   │   ├── raw.ts               # Raw adapter
│   │   └── types.ts             # Adapter types
│   │
│   ├── errors/
│   │   ├── index.ts             # Error exports
│   │   ├── validation.ts        # ValidationError
│   │   └── handler.ts           # HandlerError
│   │
│   └── utils/
│       ├── type-guards.ts       # Runtime type guards
│       └── response.ts          # Response helpers
│
├── tests/
│   ├── unit/
│   │   ├── handler.test.ts
│   │   ├── validators.test.ts
│   │   ├── config.test.ts
│   │   └── errors.test.ts
│   │
│   ├── integration/
│   │   ├── express.test.ts
│   │   ├── fastify.test.ts
│   │   ├── hono.test.ts
│   │   └── e2e.test.ts
│   │
│   └── types/
│       └── inference.test-d.ts
│
├── examples/
│   ├── express-zod/
│   │   ├── index.ts
│   │   └── README.md
│   ├── fastify-joi/
│   │   ├── index.ts
│   │   └── README.md
│   └── hono-yup/
│       ├── index.ts
│       └── README.md
│
├── docs/
│   ├── getting-started.md
│   ├── api-reference.md
│   ├── validators.md
│   ├── adapters.md
│   ├── use-cases/
│   │   ├── README.md
│   │   ├── event-processing.md
│   │   ├── cli-tools.md
│   │   ├── batch-jobs.md
│   │   ├── faas.md
│   │   ├── testing.md
│   │   ├── graphql.md
│   │   └── background-jobs.md
│   ├── migration-guides/
│   │   ├── from-express.md
│   │   └── from-nestjs.md
│   └── advanced/
│       ├── custom-validators.md
│       ├── custom-adapters.md
│       └── testing.md
│
├── package.json
├── tsconfig.json
├── .gitignore
├── .npmignore
├── LICENSE
└── README.md
```

---

## Usage Examples

### Example 1: Basic CRUD Handler

```typescript
import { handler } from 'typed-handler';
import { z } from 'zod';
import express from 'express';

const CreateUserSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
});

const UserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
});

const createUser = handler()
  .input(CreateUserSchema)
  .handle(async (input) => {
    const user = await db.users.create(input);
    return user;
  })
  .output(UserSchema);

const app = express();
app.use(express.json());
app.post('/users', createUser.express());
```

### Example 2: Protected Handler with Context

```typescript
import { handler } from 'typed-handler';
import { z } from 'zod';

const authMiddleware = async (req: any) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) throw new Error('Unauthorized');
  const user = await verifyToken(token);
  return { user };
};

const createPost = handler()
  .use(authMiddleware)
  .input(z.object({
    title: z.string(),
    content: z.string(),
  }))
  .handle(async (input, ctx) => {
    // ctx.user is available and typed
    const post = await db.posts.create({
      ...input,
      authorId: ctx.user.id,
    });
    return post;
  })
  .output(PostSchema);
```

### Example 3: Multi-Input Handler

```typescript
const getUser = handler()
  .input({
    params: z.object({ id: z.string() }),
    query: z.object({
      include: z.array(z.string()).optional(),
    }),
    headers: z.object({
      'x-api-key': z.string(),
    }).passthrough(),
  })
  .handle(async ({ params, query, headers }) => {
    const user = await db.users.findById(params.id);
    if (query.include) {
      // Load relations
    }
    return user;
  })
  .output(UserSchema);
```

### Example 4: Type-Only Mode (No Validation)

```typescript
interface User {
  id: string;
  name: string;
}

const getUser = handler()
  .input<{ id: string }>()
  .handle(async (input) => {
    return await cache.get<User>(input.id);
  })
  .output<User>();
```

### Example 5: Custom Validator

```typescript
import { handler, registerAdapter } from 'typed-handler';
import { CustomValidator } from 'my-validator';

registerAdapter({
  name: 'custom',
  detect: (schema) => schema instanceof CustomValidator,
  parse: async (schema, data) => schema.validate(data),
});

const myHandler = handler()
  .input(new CustomValidator({ name: 'string' }))
  .handle(async (input) => {
    return { success: true };
  });
```

### Example 6: Different Validators in Same App

```typescript
import { handler } from 'typed-handler';
import { z } from 'zod';
import Joi from 'joi';

// Team A uses Zod
const handlerA = handler()
  .input(z.object({ name: z.string() }))
  .handle(async (input) => input)
  .output(z.object({ name: z.string() }));

// Team B uses Joi
const handlerB = handler()
  .input(Joi.object({ name: Joi.string() }))
  .handle(async (input) => input)
  .output(Joi.object({ name: Joi.string() }));

// Both work seamlessly
```

### Example 7: Custom Response Status

```typescript
const createResource = handler()
  .input(CreateSchema)
  .handle(async (input) => {
    const resource = await db.create(input);
    return {
      status: 201,
      body: resource,
    };
  })
  .output(ResourceSchema);
```

### Example 8: Transform Stage

```typescript
const getUser = handler()
  .input(z.object({ id: z.string() }))
  .handle(async (input) => {
    const user = await db.users.findById(input.id);
    return user;
  })
  .transform((user) => ({
    success: true,
    data: user,
    timestamp: new Date().toISOString(),
  }))
  .output(z.object({
    success: z.boolean(),
    data: UserSchema,
    timestamp: z.string(),
  }));
```

### Example 9: Transform with Context

```typescript
const createPost = handler()
  .use(authMiddleware)
  .input(z.object({
    title: z.string(),
    content: z.string(),
  }))
  .handle(async (input, ctx) => {
    const post = await db.posts.create({
      ...input,
      authorId: ctx.user.id,
    });
    return post;
  })
  .transform((post, ctx) => ({
    ...post,
    authorName: ctx.user.name,
    enrichedAt: Date.now(),
  }))
  .output(PostSchema);
```

### Example 10: Error Handling

```typescript
import { HandlerError } from 'typed-handler';

const getUser = handler()
  .input(z.object({ id: z.string() }))
  .handle(async (input) => {
    const user = await db.users.findById(input.id);
    if (!user) {
      throw new HandlerError('User not found', 404);
    }
    return user;
  })
  .output(UserSchema);

// In Express
app.use((err, req, res, next) => {
  if (err instanceof HandlerError) {
    return res.status(err.statusCode).json({ error: err.message });
  }
  next(err);
});
```

---

## Performance Considerations

### Validation Overhead

**Input Validation**: Necessary security measure, cannot be skipped in production

**Output Validation**: Can be disabled in production for performance:

```typescript
configure({
  validateOutput: process.env.NODE_ENV !== 'production',
});
```

### Middleware Chain

Each middleware adds:
- Function call overhead (minimal)
- Context object spreading (shallow copy)

Recommendation: Keep middleware chain short (<5 middleware)

### Immutability Overhead

Each builder method creates a new handler instance via cloning. This is negligible during setup (happens once per route) and has no runtime cost.

### Framework Adapter Overhead

Adapters add minimal overhead:
1. Input extraction from request
2. Handler execution
3. Response formatting

Benchmarks should be run against:
- Raw Express handler
- Handler with typed-handler
- Difference should be <5% in most cases

### Memory Considerations

Each handler instance stores:
- Validator references
- Middleware array
- Handler function
- Configuration object

For large applications with hundreds of routes, this is negligible (<1MB total).

### Optimization Strategies

1. **Disable output validation in production**
2. **Use type-only mode for trusted internal services**
3. **Reuse middleware functions** (don't create inline)
4. **Cache validator instances** (don't recreate schemas)

---

## Future Enhancements

### Phase 2 Features

1. **OpenAPI Generation**
   ```typescript
   import { generateOpenAPI } from 'typed-handler/openapi';
   const spec = generateOpenAPI(handlers);
   ```

2. **Client SDK Generation**
   ```typescript
   import { generateClient } from 'typed-handler/codegen';
   const client = generateClient(handlers);
   ```

3. **Testing Utilities**
   ```typescript
   import { createHandlerTest } from 'typed-handler/testing';
   const test = createHandlerTest(handler);
   await test({ name: 'John' }).expect(200).toMatchObject({ id: expect.any(String) });
   ```

4. **Response Schemas by Status Code**
   ```typescript
   handler()
     .input(schema)
     .handle(fn)
     .output({
       200: SuccessSchema,
       404: NotFoundSchema,
       500: ErrorSchema,
     });
   ```

5. **Batch Operations**
   ```typescript
   handler()
     .inputBatch(schema)
     .handle(async (inputs) => {
       return await Promise.all(inputs.map(process));
     });
   ```

### Phase 3 Features

1. **Rate Limiting**
2. **Caching**
3. **Metrics/Observability**
4. **GraphQL Adapter**
5. **WebSocket Support**

### Community Features

1. **Plugin System**: Allow community plugins for common patterns
2. **Validator Plugins**: Community-contributed validator adapters
3. **Framework Plugins**: Community-contributed framework adapters

---

## Dependencies

### Core Library

**Zero dependencies** - The core library has no runtime dependencies

### Peer Dependencies

```json
{
  "peerDependencies": {
    "typescript": ">=4.7.0"
  },
  "peerDependenciesMeta": {
    "typescript": {
      "optional": false
    }
  }
}
```

### Dev Dependencies

```json
{
  "devDependencies": {
    "@types/express": "^4.17.21",
    "@types/node": "^20.0.0",
    "express": "^4.18.0",
    "fastify": "^4.25.0",
    "hono": "^3.11.0",
    "joi": "^17.11.0",
    "typescript": "^5.3.0",
    "vitest": "^1.0.0",
    "yup": "^1.3.0",
    "zod": "^3.22.0"
  }
}
```

### Optional Dependencies

Users install validation libraries they need:
- `zod` - for Zod validation
- `joi` - for Joi validation
- `yup` - for Yup validation

Users install framework dependencies they need:
- `express` - for Express adapter
- `fastify` - for Fastify adapter
- `hono` - for Hono adapter

---

## Distribution

### NPM Package

**Package Name**: `typed-handler`

**Entry Points**:
```json
{
  "main": "./dist/index.js",
  "module": "./dist/index.mjs",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.mjs",
      "require": "./dist/index.js",
      "types": "./dist/index.d.ts"
    },
    "./adapters": {
      "import": "./dist/adapters/index.mjs",
      "require": "./dist/adapters/index.js",
      "types": "./dist/adapters/index.d.ts"
    }
  }
}
```

### TypeScript Support

- Ship type declarations
- Support TypeScript 4.7+
- Ensure proper type inference

### Build Process

1. Compile TypeScript to JavaScript (CommonJS + ESM)
2. Generate type declarations
3. Bundle if necessary (probably not needed)
4. Run tests
5. Publish to NPM

---

## Success Metrics

### Adoption Metrics

- NPM downloads per week
- GitHub stars
- Community contributions
- Issues/PRs activity

### Technical Metrics

- Test coverage >90%
- Zero critical bugs
- Performance overhead <5%
- Type inference success rate 100%

### Community Metrics

- Documentation completeness
- Example coverage
- Response time to issues
- Community engagement

---

## Risks and Mitigations

### Risk 1: Poor Adoption

**Mitigation**:
- Excellent documentation
- Multiple examples
- Migration guides
- Active community engagement

### Risk 2: Type Inference Issues

**Mitigation**:
- Comprehensive type tests
- Clear error messages
- Fallback to explicit types

### Risk 3: Validator Breaking Changes

**Mitigation**:
- Adapter abstraction layer
- Version compatibility matrix
- Quick adapter updates

### Risk 4: Framework Incompatibility

**Mitigation**:
- Raw adapter for custom integration
- Framework version testing
- Clear compatibility documentation

---

## Conclusion

`typed-handler` provides a clean, type-safe API for building request handlers that work with any validation library and any web framework. The library prioritizes developer experience, type safety, and flexibility while maintaining minimal dependencies and overhead.

The validator-agnostic design allows teams to adopt the library without changing their existing validation strategy, making it a practical choice for incremental adoption in existing codebases.

By focusing on doing one thing well (handler construction) and providing clear escape hatches, the library aims to be useful without being opinionated or constraining.

---

## Appendices

### Appendix A: Type Inference Examples

```typescript
// Example 1: Basic inference
const h1 = handler()
  .input(z.object({ name: z.string() }))
  .handle(async (input) => {
    // input: { name: string }
    return { id: '1', ...input };
  })
  .output(z.object({ id: z.string(), name: z.string() }));

// Example 2: Context inference
const h2 = handler()
  .use(async () => ({ user: { id: '1' } }))
  .use(async (req, ctx) => {
    // ctx: { user: { id: string } }
    return { org: { id: ctx.user.id } };
  })
  .input(z.object({ data: z.string() }))
  .handle(async (input, ctx) => {
    // input: { data: string }
    // ctx: { user: { id: string }, org: { id: string } }
    return { success: true };
  });

// Example 3: Multi-input inference
const h3 = handler()
  .input({
    params: z.object({ id: z.string() }),
    query: z.object({ page: z.number() }),
  })
  .handle(async ({ params, query }) => {
    // params: { id: string }
    // query: { page: number }
    return { id: params.id, page: query.page };
  });
```

### Appendix B: Comparison with Other Libraries

| Feature | typed-handler | NestJS | tRPC | Express |
|---------|--------------|---------|------|---------|
| Type Safety | ✅ Full | ✅ Full | ✅ Full | ❌ None |
| Validator Agnostic | ✅ Yes | ❌ No | ❌ No (Zod) | ✅ Yes |
| Framework Agnostic | ✅ Yes | ❌ No | ⚠️ Limited | N/A |
| Learning Curve | Low | High | Medium | Low |
| Bundle Size | ~10KB | ~500KB | ~50KB | ~200KB |
| Decorators Required | ❌ No | ✅ Yes | ❌ No | ❌ No |

### Appendix C: Migration Examples

**From Express**:
```typescript
// Before
app.post('/users', async (req, res) => {
  const { name } = req.body;
  const user = await db.users.create({ name });
  res.json(user);
});

// After
const createUser = handler()
  .input(z.object({ name: z.string() }))
  .handle(async (input) => {
    return await db.users.create(input);
  })
  .output(UserSchema);

app.post('/users', createUser.express());
```

**From NestJS**:
```typescript
// Before
@Controller('users')
export class UsersController {
  @Post()
  async create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }
}

// After
const createUser = handler()
  .input(CreateUserSchema)
  .handle(async (input) => {
    return usersService.create(input);
  })
  .output(UserSchema);
```

---

**End of Technical Specification**
