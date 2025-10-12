# typed-handler - Setup Guide

This document provides quick reference for setting up and working with the typed-handler project.

## Initial Setup

```bash
# Install dependencies
pnpm install

# Set up git hooks
pnpm prepare
```

## Development Commands

```bash
# Development (runs example with hot reload)
pnpm dev

# Run tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run tests with coverage
pnpm test:coverage

# Run type tests
pnpm test:types

# Type checking
pnpm type-check

# Build the library
pnpm build

# Lint code
pnpm lint

# Fix lint issues
pnpm lint:fix

# Format code
pnpm format
```

## Docker Commands

```bash
# Development with hot reload
docker-compose up dev

# Run tests in watch mode
docker-compose up test

# Run tests with coverage
docker-compose run test-coverage

# Build the library
docker-compose up build

# Lint code
docker-compose run lint

# Type check
docker-compose run type-check
```

## Release Workflow

```bash
# 1. Create a changeset (documents changes)
pnpm changeset

# 2. Version packages (updates version and CHANGELOG)
pnpm version

# 3. Build and publish (automated via GitHub Actions on main branch)
pnpm release
```

## Project Tooling

### Build Tool: tsup
- **Speed**: ~100x faster than tsc
- **Output**: Dual ESM/CJS with TypeScript declarations
- **Config**: `tsup.config.ts`

### Test Framework: Vitest
- **Speed**: ~10x faster than Jest
- **Features**: Native TypeScript, HMR, coverage with v8
- **Config**: `vitest.config.ts`

### Linter/Formatter: Biome
- **Speed**: ~100x faster than ESLint + Prettier
- **Features**: All-in-one linting and formatting
- **Config**: `biome.json`

### Package Manager: pnpm
- **Speed**: ~3x faster than npm
- **Features**: Efficient disk usage, strict dependency resolution
- **Config**: `package.json`

### Git Hooks: simple-git-hooks
- **Speed**: ~10x lighter than Husky
- **Pre-commit**: Runs lint-staged (lint + format changed files)
- **Pre-push**: Runs type-check + tests
- **Config**: `package.json` (simple-git-hooks and lint-staged fields)

### Version Management: Changesets
- **Features**: Semantic versioning, changelog generation
- **Workflow**: Create changeset → Version → Publish
- **Config**: `.changeset/config.json`

## CI/CD Pipeline

### GitHub Actions Workflows

**CI Workflow** (`.github/workflows/ci.yml`):
- Triggered on: Push to main/develop, PRs
- Jobs:
  - Lint & Format check
  - Type checking
  - Tests (Node 18, 20, 22)
  - Type definition tests
  - Build verification
  - Coverage upload to Codecov

**Release Workflow** (`.github/workflows/release.yml`):
- Triggered on: Push to main
- Jobs:
  - Build library
  - Create release PR (via Changesets)
  - Publish to npm (with provenance)

### Required Secrets

Add these secrets to your GitHub repository:
- `NPM_TOKEN`: npm access token for publishing
- `CODECOV_TOKEN`: Codecov token for coverage reports (optional)

## Directory Structure

```
typed-handler/
├── src/                      # Source code
│   ├── index.ts             # Main entry point
│   ├── handler.ts           # Handler class
│   ├── types.ts             # Type definitions
│   ├── config.ts            # Configuration
│   ├── validators/          # Validator system
│   ├── adapters/            # Framework adapters
│   ├── errors/              # Error classes
│   └── utils/               # Utilities
├── tests/                   # Test files
│   ├── unit/               # Unit tests
│   ├── integration/        # Integration tests
│   └── types/              # Type tests (tsd)
├── examples/               # Usage examples
│   ├── express-zod/
│   ├── fastify-joi/
│   └── hono-yup/
├── docs/                   # Documentation
├── dist/                   # Build output (gitignored)
└── coverage/              # Test coverage (gitignored)
```

## Next Steps

1. **Implement Core Handler**: Start with `src/handler.ts`
2. **Add Validator System**: Implement adapters in `src/validators/`
3. **Create Framework Adapters**: Build Express/Fastify/Hono adapters
4. **Write Tests**: Add unit and integration tests
5. **Add Examples**: Create working examples for each framework
6. **Update Documentation**: Fill in API docs and guides

## Performance Tips

1. **Development**:
   - Use `pnpm dev` for hot reload during development
   - Use `pnpm test:watch` for continuous testing
   - Vitest only reruns affected tests

2. **CI/CD**:
   - GitHub Actions caches pnpm dependencies
   - Parallel job execution for faster CI
   - Only required checks block merging

3. **Production**:
   - Output validation disabled by default in production
   - Tree-shaking and minification via tsup
   - Zero runtime dependencies

## Troubleshooting

### Git hooks not running
```bash
pnpm prepare
```

### pnpm install fails
```bash
# Clear cache and reinstall
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

### Docker build issues
```bash
# Rebuild without cache
docker-compose build --no-cache dev
```

### Type errors in IDE
```bash
# Restart TypeScript server in VS Code
# Command Palette: "TypeScript: Restart TS Server"
```

## VS Code Recommended Extensions

- Biome (biomejs.biome)
- TypeScript and JavaScript Language Features (built-in)
- Docker (ms-azuretools.vscode-docker)

## Resources

- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/)
- [tsup Documentation](https://tsup.egoist.dev/)
- [Vitest Documentation](https://vitest.dev/)
- [Biome Documentation](https://biomejs.dev/)
- [Changesets Documentation](https://github.com/changesets/changesets)
