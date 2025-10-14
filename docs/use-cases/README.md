# Use Cases

While `typed-handler` excels at building type-safe web APIs, its framework-agnostic and validation-agnostic design makes it valuable across many different application types. The raw adapter allows you to leverage typed-handler's structured data processing, type inference, and middleware patterns in any context where you need predictable, type-safe data transformations.

## Available Use Cases

- **[Event Processing Systems](./event-processing.md)** - Build type-safe event handlers for domain events and event-driven architectures
- **[CLI Tools and Scripts](./cli-tools.md)** - Process command-line arguments and user input with validation and type safety
- **[Batch Processing Jobs](./batch-jobs.md)** - Transform data through multi-stage pipelines with middleware and validation
- **[Function-as-a-Service](./faas.md)** - Create type-safe serverless functions for AWS Lambda, Cloudflare Workers, and other FaaS platforms
- **[Testing and Mocking](./testing.md)** - Generate test fixtures and mock external services with type-safe handlers
- **[GraphQL Resolvers](./graphql.md)** - Build type-safe GraphQL field resolvers with validation and context management
- **[NestJS Integration](./nestjs.md)** - Integrate typed-handler with NestJS using adapters, decorators, and services
- **[Background Job Processing](./background-jobs.md)** - Process queue messages and stream events with type-safe handlers

Each use case demonstrates how typed-handler's raw adapter enables structured data processing beyond traditional HTTP request handling.
