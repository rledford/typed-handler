# typed-handler

## 0.2.0

### Minor Changes

- Add custom header support to ResponseObject. Framework adapters (Express, Fastify, Hono) now apply custom headers from ResponseObject when present.

## 0.1.0

### Minor Changes

- fc9e5f1: Add transform stage to handler execution flow for data transformation between handler output and validation

  This feature introduces a `.transform()` method that allows transforming handler output before validation. The transform function receives the handler output and context, enabling:

  - Data normalization and enrichment
  - Response wrapping (e.g., adding success flags, timestamps)
  - Format conversion
  - Context-aware transformations

  The transform stage executes after the handler function but before output validation, maintaining full type safety throughout the chain.
