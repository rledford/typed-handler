# Background Job Processing

Background job processors benefit from structured message handling with validation and type safety. The raw adapter enables you to build type-safe job processors for queue systems like BullMQ, message streams like Kafka, and other asynchronous processing platforms while maintaining consistent error handling and retry patterns.

## BullMQ Job Processor

Build type-safe BullMQ job processors with validation using Yup.

```typescript
import { handler, raw } from 'typed-handler';
import * as yup from 'yup';
import { Queue, Worker } from 'bullmq';

const emailJobSchema = yup.object({
  to: yup.string().email().required(),
  subject: yup.string().min(1).required(),
  template: yup.string().required(),
  variables: yup.object().required(),
  priority: yup.string().oneOf(['high', 'normal', 'low']).default('normal')
});

const processEmailHandler = handler()
  .input(emailJobSchema)
  .use(async () => ({
    emailService: getEmailService(),
    templateEngine: getTemplateEngine()
  }))
  .handle(async (input, ctx) => {
    const html = await ctx.templateEngine.render(
      input.template,
      input.variables
    );

    const result = await ctx.emailService.send({
      to: input.to,
      subject: input.subject,
      html
    });

    return {
      sent: true,
      messageId: result.messageId,
      recipient: input.to,
      template: input.template
    };
  });

const processEmail = raw(processEmailHandler);

const emailQueue = new Queue('email', {
  connection: { host: 'localhost', port: 6379 }
});

const worker = new Worker(
  'email',
  async (job) => {
    const result = await processEmail(job.data);

    if (!result.success) {
      throw new Error(result.error?.message || 'Email processing failed');
    }

    return result.data;
  },
  {
    connection: { host: 'localhost', port: 6379 },
    concurrency: 5
  }
);

worker.on('completed', (job, result) => {
  console.log(`Email sent: ${result.messageId} to ${result.recipient}`);
});

worker.on('failed', (job, err) => {
  console.error(`Job ${job?.id} failed:`, err.message);
});

await emailQueue.add('send', {
  to: 'user@example.com',
  subject: 'Welcome!',
  template: 'welcome',
  variables: { name: 'John' },
  priority: 'high'
});
```

## Kafka Consumer

Process Kafka messages with type-safe handlers using type-only mode.

```typescript
import { handler, raw } from 'typed-handler';
import { Kafka, type EachMessagePayload } from 'kafkajs';

interface OrderEvent {
  orderId: string;
  customerId: string;
  items: Array<{
    productId: string;
    quantity: number;
    price: number;
  }>;
  total: number;
  status: 'pending' | 'processing' | 'completed' | 'cancelled';
  timestamp: string;
}

const processOrderEventHandler = handler<OrderEvent>()
  .use(async (input) => ({
    orderId: input.orderId,
    logger: getLogger().child({ orderId: input.orderId })
  }))
  .use(async (input, ctx) => {
    ctx.logger.info('Processing order event', {
      status: input.status,
      total: input.total
    });

    return {
      orderService: getOrderService(),
      inventoryService: getInventoryService(),
      notificationService: getNotificationService()
    };
  })
  .handle(async (input, ctx) => {
    switch (input.status) {
      case 'pending': {
        await ctx.inventoryService.reserve(input.items);
        await ctx.orderService.updateStatus(input.orderId, 'processing');
        break;
      }

      case 'processing': {
        await ctx.orderService.processPayment(input.orderId, input.total);
        await ctx.orderService.updateStatus(input.orderId, 'completed');
        break;
      }

      case 'completed': {
        await ctx.notificationService.sendOrderConfirmation(
          input.customerId,
          input.orderId
        );
        break;
      }

      case 'cancelled': {
        await ctx.inventoryService.release(input.items);
        await ctx.notificationService.sendOrderCancellation(
          input.customerId,
          input.orderId
        );
        break;
      }
    }

    ctx.logger.info('Order event processed successfully', {
      status: input.status
    });

    return {
      processed: true,
      orderId: input.orderId,
      status: input.status
    };
  });

const processOrderEvent = raw(processOrderEventHandler);

const kafka = new Kafka({
  clientId: 'order-processor',
  brokers: ['localhost:9092']
});

const consumer = kafka.consumer({ groupId: 'order-processor-group' });

async function run() {
  await consumer.connect();
  await consumer.subscribe({ topic: 'orders', fromBeginning: true });

  await consumer.run({
    eachMessage: async ({ topic, partition, message }: EachMessagePayload) => {
      const value = message.value?.toString();

      if (!value) {
        return;
      }

      const orderEvent = JSON.parse(value);
      const result = await processOrderEvent(orderEvent);

      if (!result.success) {
        console.error('Failed to process order event:', {
          orderId: orderEvent.orderId,
          error: result.error?.message
        });
      }
    }
  });
}

run();
```

## Error Handling and Retry Patterns

Implement robust error handling and retry logic for background jobs.

```typescript
import { handler, raw } from 'typed-handler';
import { z } from 'zod';
import { Queue, Worker } from 'bullmq';

const imageProcessingJobSchema = z.object({
  imageUrl: z.string().url(),
  operations: z.array(z.object({
    type: z.enum(['resize', 'crop', 'watermark', 'compress']),
    params: z.record(z.unknown())
  })),
  outputBucket: z.string(),
  callbackUrl: z.string().url().optional()
});

const processImageJobHandler = handler()
  .input(imageProcessingJobSchema)
  .use(async () => ({
    imageService: getImageService(),
    storageService: getStorageService(),
    httpClient: getHttpClient()
  }))
  .use(async (input, ctx) => {
    const imageBuffer = await ctx.httpClient.downloadImage(input.imageUrl);

    return { imageBuffer };
  })
  .handle(async (input, ctx) => {
    let processedImage = ctx.imageBuffer;

    for (const operation of input.operations) {
      try {
        processedImage = await ctx.imageService.apply(
          processedImage,
          operation.type,
          operation.params
        );
      } catch (error) {
        throw new Error(
          `Failed to apply ${operation.type}: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    }

    const outputKey = `processed/${crypto.randomUUID()}.jpg`;

    await ctx.storageService.upload(
      input.outputBucket,
      outputKey,
      processedImage
    );

    const outputUrl = await ctx.storageService.getPublicUrl(
      input.outputBucket,
      outputKey
    );

    if (input.callbackUrl) {
      await ctx.httpClient.post(input.callbackUrl, {
        originalUrl: input.imageUrl,
        outputUrl,
        operations: input.operations.length
      });
    }

    return {
      success: true,
      originalUrl: input.imageUrl,
      outputUrl,
      operationsApplied: input.operations.length
    };
  });

const processImageJob = raw(processImageJobHandler);

const imageQueue = new Queue('image-processing', {
  connection: { host: 'localhost', port: 6379 },
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000
    }
  }
});

const worker = new Worker(
  'image-processing',
  async (job) => {
    const result = await processImageJob(job.data);

    if (!result.success) {
      const error = new Error(result.error?.message || 'Processing failed');

      if (result.error?.name === 'ValidationError') {
        job.discard();
      }

      throw error;
    }

    return result.data;
  },
  {
    connection: { host: 'localhost', port: 6379 },
    concurrency: 10
  }
);

worker.on('completed', (job, result) => {
  console.log(`Image processed: ${result.outputUrl}`);
});

worker.on('failed', (job, err) => {
  console.error(`Job ${job?.id} failed (attempt ${job?.attemptsMade}/${job?.opts.attempts}):`, err.message);
});

await imageQueue.add('process', {
  imageUrl: 'https://example.com/image.jpg',
  operations: [
    { type: 'resize', params: { width: 800, height: 600 } },
    { type: 'compress', params: { quality: 85 } }
  ],
  outputBucket: 'processed-images',
  callbackUrl: 'https://api.example.com/webhooks/image-processed'
});
```

## Job Priority and Rate Limiting

Manage job priority and rate limiting with type-safe handlers.

```typescript
import { handler, raw } from 'typed-handler';
import { z } from 'zod';
import { Queue, Worker, QueueScheduler } from 'bullmq';

const notificationJobSchema = z.object({
  userId: z.string().uuid(),
  type: z.enum(['email', 'sms', 'push']),
  priority: z.enum(['urgent', 'high', 'normal', 'low']).default('normal'),
  content: z.object({
    title: z.string(),
    body: z.string(),
    data: z.record(z.unknown()).optional()
  })
});

const sendNotificationHandler = handler()
  .input(notificationJobSchema)
  .use(async (input) => {
    const rateLimiter = getRateLimiter(`notifications:${input.userId}`);
    const allowed = await rateLimiter.checkLimit();

    if (!allowed) {
      throw new Error('Rate limit exceeded for user');
    }

    return {
      notificationService: getNotificationService(),
      userService: getUserService()
    };
  })
  .handle(async (input, ctx) => {
    const user = await ctx.userService.getUser(input.userId);

    if (!user) {
      throw new Error('User not found');
    }

    const result = await ctx.notificationService.send({
      type: input.type,
      recipient: user,
      title: input.content.title,
      body: input.content.body,
      data: input.content.data
    });

    return {
      sent: true,
      notificationId: result.id,
      userId: input.userId,
      type: input.type
    };
  });

const sendNotification = raw(sendNotificationHandler);

const notificationQueue = new Queue('notifications', {
  connection: { host: 'localhost', port: 6379 }
});

const scheduler = new QueueScheduler('notifications', {
  connection: { host: 'localhost', port: 6379 }
});

const worker = new Worker(
  'notifications',
  async (job) => {
    const result = await sendNotification(job.data);

    if (!result.success) {
      throw new Error(result.error?.message || 'Notification failed');
    }

    return result.data;
  },
  {
    connection: { host: 'localhost', port: 6379 },
    limiter: {
      max: 100,
      duration: 60000
    }
  }
);

const priorityMap = {
  urgent: 1,
  high: 2,
  normal: 3,
  low: 4
};

await notificationQueue.add(
  'send',
  {
    userId: 'user-123',
    type: 'email',
    priority: 'urgent',
    content: {
      title: 'Security Alert',
      body: 'Unusual activity detected on your account'
    }
  },
  {
    priority: priorityMap.urgent
  }
);
```

The raw adapter provides structured message processing for background jobs while maintaining type safety, validation, and error handling patterns throughout your asynchronous processing pipeline.
