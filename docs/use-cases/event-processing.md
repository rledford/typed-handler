# Event Processing Systems

Event-driven architectures benefit from structured data processing with validation and type safety. The raw adapter enables you to create type-safe event handlers that process domain events, integrate with event buses, and maintain consistent error handling across your event processing pipeline.

## Processing Domain Events

Domain events often require validation to ensure event data integrity and type-safe handlers to process business logic correctly.

```typescript
import { handler, raw } from 'typed-handler';
import { z } from 'zod';

const orderPlacedSchema = z.object({
  eventType: z.literal('order.placed'),
  orderId: z.string().uuid(),
  customerId: z.string().uuid(),
  items: z.array(z.object({
    productId: z.string(),
    quantity: z.number().positive(),
    price: z.number().positive()
  })),
  timestamp: z.string().datetime()
});

const orderPlacedHandler = handler()
  .input(orderPlacedSchema)
  .use(async () => ({
    emailService: getEmailService(),
    inventoryService: getInventoryService()
  }))
  .handle(async (event, ctx) => {
    await ctx.inventoryService.reserveItems(event.items);

    await ctx.emailService.sendOrderConfirmation({
      orderId: event.orderId,
      customerId: event.customerId
    });

    return { processed: true, orderId: event.orderId };
  });

const processEvent = raw(orderPlacedHandler);

eventBus.on('order.placed', async (eventData) => {
  const result = await processEvent(eventData);

  if (!result.success) {
    logger.error('Failed to process order.placed event', {
      error: result.error
    });
  }
});
```

## Event Bus Integration

Integrate typed-handler with event bus systems to ensure type-safe event routing and consistent error handling.

```typescript
import { handler, raw } from 'typed-handler';
import { z } from 'zod';

const baseEventSchema = z.object({
  eventId: z.string().uuid(),
  eventType: z.string(),
  timestamp: z.string().datetime(),
  metadata: z.record(z.unknown()).optional()
});

const userCreatedSchema = baseEventSchema.extend({
  eventType: z.literal('user.created'),
  data: z.object({
    userId: z.string().uuid(),
    email: z.string().email(),
    role: z.enum(['user', 'admin'])
  })
});

const userCreatedHandler = handler()
  .input(userCreatedSchema)
  .use(async (input) => ({
    eventId: input.eventId,
    logger: getLogger().child({ eventId: input.eventId })
  }))
  .use(async (input, ctx) => {
    ctx.logger.info('Processing user.created event', {
      userId: input.data.userId
    });

    return {
      userService: getUserService(),
      notificationService: getNotificationService()
    };
  })
  .handle(async (event, ctx) => {
    await ctx.userService.sendWelcomeEmail(event.data.email);

    await ctx.notificationService.notifyAdmins({
      message: `New user registered: ${event.data.email}`,
      role: event.data.role
    });

    ctx.logger.info('Successfully processed user.created event');

    return { processed: true, userId: event.data.userId };
  });

const processUserCreated = raw(userCreatedHandler);

class EventBus {
  private handlers = new Map<string, (event: unknown) => Promise<void>>();

  register<T>(eventType: string, handler: (data: T) => Promise<unknown>) {
    this.handlers.set(eventType, handler as (event: unknown) => Promise<void>);
  }

  async publish(event: { eventType: string; [key: string]: unknown }) {
    const handler = this.handlers.get(event.eventType);

    if (!handler) {
      throw new Error(`No handler registered for event type: ${event.eventType}`);
    }

    await handler(event);
  }
}

const eventBus = new EventBus();
eventBus.register('user.created', processUserCreated);

await eventBus.publish({
  eventId: '123e4567-e89b-12d3-a456-426614174000',
  eventType: 'user.created',
  timestamp: new Date().toISOString(),
  data: {
    userId: '987fcdeb-51a2-43d7-9f12-345678901234',
    email: 'user@example.com',
    role: 'user'
  }
});
```

## Error Handling Patterns

Event processing systems require robust error handling to manage validation failures, processing errors, and retry logic.

```typescript
import { handler, raw } from 'typed-handler';
import { z } from 'zod';

const paymentEventSchema = z.object({
  eventType: z.literal('payment.received'),
  paymentId: z.string().uuid(),
  amount: z.number().positive(),
  currency: z.string().length(3)
});

const paymentHandler = handler()
  .input(paymentEventSchema)
  .use(async () => ({
    paymentService: getPaymentService(),
    retryCount: 0
  }))
  .handle(async (event, ctx) => {
    try {
      await ctx.paymentService.processPayment({
        paymentId: event.paymentId,
        amount: event.amount,
        currency: event.currency
      });

      return { processed: true, paymentId: event.paymentId };
    } catch (error) {
      if (isRetryableError(error) && ctx.retryCount < 3) {
        throw new Error('Retryable error occurred');
      }

      await ctx.paymentService.markAsFailed(event.paymentId);
      throw error;
    }
  });

const processPayment = raw(paymentHandler);

async function handlePaymentEvent(eventData: unknown, retryCount = 0) {
  const result = await processPayment(eventData, { retryCount });

  if (!result.success) {
    if (result.error?.name === 'ValidationError') {
      logger.error('Invalid payment event data', {
        errors: result.error.message
      });
      return;
    }

    if (retryCount < 3) {
      await delay(1000 * Math.pow(2, retryCount));
      return handlePaymentEvent(eventData, retryCount + 1);
    }

    logger.error('Payment processing failed after retries', {
      error: result.error
    });
  }
}
```

The raw adapter provides structured data processing for event-driven systems while maintaining type safety and validation throughout your event handling pipeline.
