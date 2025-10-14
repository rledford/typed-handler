# Batch Processing Jobs

Batch processing pipelines benefit from structured data transformation with validation at each stage. The raw adapter enables you to build multi-stage data processing pipelines with type-safe handlers, middleware for shared processing logic, and comprehensive error handling.

## CSV Data Processing Pipeline

Process CSV data through validation and transformation stages with Zod validation.

```typescript
import { handler, raw } from 'typed-handler';
import { z } from 'zod';
import * as fs from 'fs/promises';
import { parse } from 'csv-parse/sync';

const customerRecordSchema = z.object({
  id: z.string().uuid(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  phone: z.string().regex(/^\+?[1-9]\d{1,14}$/),
  registeredAt: z.string().datetime(),
  status: z.enum(['active', 'inactive', 'suspended'])
});

const processCustomerHandler = handler()
  .input(customerRecordSchema)
  .use(async () => ({
    db: getDatabaseConnection(),
    emailService: getEmailService()
  }))
  .handle(async (record, ctx) => {
    const existing = await ctx.db.customers.findById(record.id);

    if (existing) {
      await ctx.db.customers.update(record.id, {
        firstName: record.firstName,
        lastName: record.lastName,
        email: record.email,
        phone: record.phone,
        status: record.status
      });

      return {
        action: 'updated',
        customerId: record.id
      };
    }

    await ctx.db.customers.create(record);

    await ctx.emailService.sendWelcome(record.email);

    return {
      action: 'created',
      customerId: record.id
    };
  });

const processCustomer = raw(processCustomerHandler);

async function processCsvFile(filePath: string) {
  const content = await fs.readFile(filePath, 'utf-8');
  const records = parse(content, {
    columns: true,
    skip_empty_lines: true
  });

  const results = {
    total: records.length,
    processed: 0,
    created: 0,
    updated: 0,
    errors: [] as Array<{ row: number; error: string }>
  };

  for (let i = 0; i < records.length; i++) {
    const record = records[i];
    const result = await processCustomer(record);

    if (!result.success) {
      results.errors.push({
        row: i + 1,
        error: result.error?.message || 'Unknown error'
      });
      continue;
    }

    results.processed++;

    if (result.data.action === 'created') {
      results.created++;
    } else {
      results.updated++;
    }
  }

  return results;
}

async function main() {
  const results = await processCsvFile('./data/customers.csv');

  console.log(`Processed ${results.processed}/${results.total} records`);
  console.log(`Created: ${results.created}, Updated: ${results.updated}`);

  if (results.errors.length > 0) {
    console.log(`\nErrors (${results.errors.length}):`);
    for (const error of results.errors) {
      console.log(`  Row ${error.row}: ${error.error}`);
    }
  }
}

main();
```

## Multi-Stage Data Transformation

Build data processing pipelines with middleware for shared transformation logic.

```typescript
import { handler, raw } from 'typed-handler';
import { z } from 'zod';

const rawDataSchema = z.object({
  timestamp: z.string(),
  sensor_id: z.string(),
  temperature: z.number(),
  humidity: z.number(),
  pressure: z.number()
});

const normalizeTimestamp = handler<z.infer<typeof rawDataSchema>>()
  .use(async (input) => ({
    normalizedTimestamp: new Date(input.timestamp).toISOString()
  }))
  .handle(async (input, ctx) => ({
    ...input,
    timestamp: ctx.normalizedTimestamp
  }));

const validateRanges = handler<z.infer<typeof rawDataSchema>>()
  .use(async (input) => {
    const warnings: string[] = [];

    if (input.temperature < -40 || input.temperature > 85) {
      warnings.push(`Temperature out of range: ${input.temperature}°C`);
    }

    if (input.humidity < 0 || input.humidity > 100) {
      warnings.push(`Humidity out of range: ${input.humidity}%`);
    }

    if (input.pressure < 870 || input.pressure > 1085) {
      warnings.push(`Pressure out of range: ${input.pressure} hPa`);
    }

    return { warnings };
  })
  .handle(async (input, ctx) => ({
    ...input,
    warnings: ctx.warnings
  }));

const enrichWithMetadata = handler()
  .input(rawDataSchema)
  .use(async (input) => ({
    sensorRegistry: getSensorRegistry()
  }))
  .use(async (input, ctx) => {
    const sensorInfo = await ctx.sensorRegistry.lookup(input.sensor_id);

    return {
      location: sensorInfo.location,
      sensorType: sensorInfo.type
    };
  })
  .handle(async (input, ctx) => ({
    sensorId: input.sensor_id,
    timestamp: input.timestamp,
    location: ctx.location,
    sensorType: ctx.sensorType,
    readings: {
      temperature: input.temperature,
      humidity: input.humidity,
      pressure: input.pressure
    }
  }));

const processNormalize = raw(normalizeTimestamp);
const processValidate = raw(validateRanges);
const processEnrich = raw(enrichWithMetadata);

async function processDataPipeline(rawData: unknown[]) {
  const results = [];

  for (const data of rawData) {
    const normalized = await processNormalize(data);
    if (!normalized.success) {
      console.error('Normalization failed:', normalized.error?.message);
      continue;
    }

    const validated = await processValidate(normalized.data);
    if (!validated.success) {
      console.error('Validation failed:', validated.error?.message);
      continue;
    }

    if (validated.data.warnings && validated.data.warnings.length > 0) {
      console.warn('Warnings:', validated.data.warnings);
    }

    const enriched = await processEnrich(validated.data);
    if (!enriched.success) {
      console.error('Enrichment failed:', enriched.error?.message);
      continue;
    }

    results.push(enriched.data);
  }

  return results;
}

async function main() {
  const rawData = await loadSensorData('./data/sensors.json');
  const processed = await processDataPipeline(rawData);

  await saveToDatabaseBatch(processed);

  console.log(`Successfully processed ${processed.length}/${rawData.length} records`);
}

main();
```

## Error Handling and Logging

Implement comprehensive error handling and logging for batch processing operations.

```typescript
import { handler, raw } from 'typed-handler';
import { z } from 'zod';

const transactionSchema = z.object({
  id: z.string().uuid(),
  accountId: z.string().uuid(),
  amount: z.number(),
  type: z.enum(['debit', 'credit']),
  description: z.string().optional()
});

const processTransactionHandler = handler()
  .input(transactionSchema)
  .use(async (input) => {
    const logger = getLogger().child({
      transactionId: input.id,
      accountId: input.accountId
    });

    logger.info('Processing transaction', {
      type: input.type,
      amount: input.amount
    });

    return { logger, startTime: Date.now() };
  })
  .use(async (input, ctx) => ({
    accountService: getAccountService(),
    auditService: getAuditService()
  }))
  .handle(async (input, ctx) => {
    try {
      const account = await ctx.accountService.getAccount(input.accountId);

      if (input.type === 'debit' && account.balance < input.amount) {
        throw new Error('Insufficient funds');
      }

      const newBalance = input.type === 'debit'
        ? account.balance - input.amount
        : account.balance + input.amount;

      await ctx.accountService.updateBalance(input.accountId, newBalance);

      await ctx.auditService.log({
        transactionId: input.id,
        accountId: input.accountId,
        type: input.type,
        amount: input.amount,
        previousBalance: account.balance,
        newBalance,
        timestamp: new Date().toISOString()
      });

      const duration = Date.now() - ctx.startTime;
      ctx.logger.info('Transaction processed successfully', {
        duration,
        newBalance
      });

      return {
        success: true,
        transactionId: input.id,
        previousBalance: account.balance,
        newBalance
      };
    } catch (error) {
      const duration = Date.now() - ctx.startTime;
      ctx.logger.error('Transaction processing failed', {
        duration,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      throw error;
    }
  });

const processTransaction = raw(processTransactionHandler);

async function processBatch(transactions: unknown[]) {
  const results = {
    total: transactions.length,
    successful: 0,
    failed: 0,
    errors: [] as Array<{ id: string; error: string }>
  };

  for (const transaction of transactions) {
    const result = await processTransaction(transaction);

    if (!result.success) {
      results.failed++;
      results.errors.push({
        id: (transaction as Record<string, unknown>).id as string || 'unknown',
        error: result.error?.message || 'Unknown error'
      });
    } else {
      results.successful++;
    }
  }

  return results;
}
```

The raw adapter provides structured data processing for batch jobs while maintaining type safety and validation throughout your data transformation pipeline.
