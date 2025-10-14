# CLI Tools and Scripts

Command-line tools benefit from structured argument processing, validation, and type-safe command handlers. The raw adapter enables you to build CLI applications with the same level of type safety and validation that typed-handler provides for web APIs, without coupling to any specific CLI framework.

## Command Argument Processing

Process command-line arguments with type inference and no validation overhead using type-only mode.

```typescript
import { handler, raw } from 'typed-handler';

interface DeployCommand {
  environment: 'dev' | 'staging' | 'production';
  version: string;
  dryRun?: boolean;
  verbose?: boolean;
}

const deployHandler = handler<DeployCommand>()
  .use(async (input) => ({
    logger: input.verbose ? console : { log: () => {} }
  }))
  .handle(async (input, ctx) => {
    ctx.logger.log(`Deploying version ${input.version} to ${input.environment}`);

    if (input.dryRun) {
      ctx.logger.log('Dry run mode - no actual deployment will occur');
      return { deployed: false, reason: 'dry-run' };
    }

    await performDeployment(input.environment, input.version);

    ctx.logger.log('Deployment completed successfully');

    return {
      deployed: true,
      environment: input.environment,
      version: input.version
    };
  });

const executeDeploy = raw(deployHandler);

async function main() {
  const args = parseArgs(process.argv.slice(2));

  const result = await executeDeploy({
    environment: args.environment as 'dev' | 'staging' | 'production',
    version: args.version,
    dryRun: args['dry-run'],
    verbose: args.verbose
  });

  if (!result.success) {
    console.error('Deployment failed:', result.error?.message);
    process.exit(1);
  }

  if (result.data.deployed) {
    console.log(`Successfully deployed ${result.data.version} to ${result.data.environment}`);
  }
}

main();
```

## Interactive CLI with Validation

Build interactive command-line tools with user input validation using Joi.

```typescript
import { handler, raw } from 'typed-handler';
import Joi from 'joi';
import * as readline from 'readline';

const userInputSchema = Joi.object({
  name: Joi.string().min(2).max(50).required(),
  email: Joi.string().email().required(),
  age: Joi.number().integer().min(18).max(120).required(),
  role: Joi.string().valid('developer', 'designer', 'manager').required()
});

const createUserHandler = handler()
  .input(userInputSchema)
  .use(async () => ({
    db: getDatabaseConnection()
  }))
  .handle(async (input, ctx) => {
    const userId = await ctx.db.users.create({
      name: input.name,
      email: input.email,
      age: input.age,
      role: input.role
    });

    return {
      success: true,
      userId,
      message: `User ${input.name} created successfully with ID ${userId}`
    };
  });

const processUserInput = raw(createUserHandler);

async function promptUser(): Promise<Record<string, unknown>> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const question = (prompt: string): Promise<string> =>
    new Promise((resolve) => rl.question(prompt, resolve));

  const answers = {
    name: await question('Enter your name: '),
    email: await question('Enter your email: '),
    age: Number.parseInt(await question('Enter your age: '), 10),
    role: await question('Enter your role (developer/designer/manager): ')
  };

  rl.close();
  return answers;
}

async function main() {
  console.log('User Registration CLI\n');

  const userInput = await promptUser();
  const result = await processUserInput(userInput);

  if (!result.success) {
    console.error('\nValidation Error:');
    console.error(result.error?.message);
    process.exit(1);
  }

  console.log(`\n${result.data.message}`);
}

main();
```

## Command Execution and Output

Handle command execution with structured output formatting and error handling.

```typescript
import { handler, raw } from 'typed-handler';
import { z } from 'zod';

const fileOperationSchema = z.object({
  operation: z.enum(['read', 'write', 'delete']),
  path: z.string().min(1),
  content: z.string().optional(),
  options: z.object({
    encoding: z.string().default('utf-8'),
    createDirs: z.boolean().default(false)
  }).optional()
});

const fileHandler = handler()
  .input(fileOperationSchema)
  .use(async (input) => ({
    fs: await import('fs/promises'),
    path: await import('path')
  }))
  .handle(async (input, ctx) => {
    switch (input.operation) {
      case 'read': {
        const content = await ctx.fs.readFile(
          input.path,
          input.options?.encoding || 'utf-8'
        );
        return {
          operation: 'read',
          path: input.path,
          content,
          size: content.length
        };
      }

      case 'write': {
        if (!input.content) {
          throw new Error('Content is required for write operation');
        }

        if (input.options?.createDirs) {
          const dir = ctx.path.dirname(input.path);
          await ctx.fs.mkdir(dir, { recursive: true });
        }

        await ctx.fs.writeFile(input.path, input.content);

        return {
          operation: 'write',
          path: input.path,
          size: input.content.length
        };
      }

      case 'delete': {
        await ctx.fs.unlink(input.path);
        return {
          operation: 'delete',
          path: input.path
        };
      }
    }
  });

const executeFileOperation = raw(fileHandler);

async function cli(args: string[]) {
  const [operation, path, ...rest] = args;

  const result = await executeFileOperation({
    operation,
    path,
    content: rest.join(' ') || undefined,
    options: {
      encoding: 'utf-8',
      createDirs: true
    }
  });

  if (!result.success) {
    console.error('Error:', result.error?.message);
    return;
  }

  console.log(JSON.stringify(result.data, null, 2));
}

cli(process.argv.slice(2));
```

The raw adapter provides structured command processing for CLI tools while maintaining type safety and validation throughout your command execution pipeline.
