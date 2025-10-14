# Testing and Mocking

Testing benefits from type-safe data generation and structured mocking patterns. The raw adapter enables you to create reusable test fixtures, mock external services with type safety, and build integration testing utilities that maintain the same validation and type inference guarantees as your production code.

## Creating Test Fixtures

Generate type-safe test data with handlers that ensure consistency across test suites.

```typescript
import { handler, raw } from 'typed-handler';
import { z } from 'zod';

const userFixtureSchema = z.object({
  overrides: z.object({
    id: z.string().uuid().optional(),
    email: z.string().email().optional(),
    role: z.enum(['user', 'admin', 'moderator']).optional(),
    createdAt: z.string().datetime().optional()
  }).optional()
});

const createUserFixtureHandler = handler()
  .input(userFixtureSchema)
  .handle(async (input) => {
    const defaults = {
      id: crypto.randomUUID(),
      email: `user-${Date.now()}@example.com`,
      firstName: 'Test',
      lastName: 'User',
      role: 'user' as const,
      verified: true,
      createdAt: new Date().toISOString()
    };

    return {
      ...defaults,
      ...input.overrides
    };
  });

const createUserFixture = raw(createUserFixtureHandler);

describe('User Service', () => {
  it('should create a user with default values', async () => {
    const fixture = await createUserFixture({});

    expect(fixture.success).toBe(true);
    expect(fixture.data).toMatchObject({
      firstName: 'Test',
      lastName: 'User',
      role: 'user',
      verified: true
    });
  });

  it('should create a user with overrides', async () => {
    const fixture = await createUserFixture({
      overrides: {
        email: 'admin@example.com',
        role: 'admin'
      }
    });

    expect(fixture.success).toBe(true);
    expect(fixture.data?.email).toBe('admin@example.com');
    expect(fixture.data?.role).toBe('admin');
  });
});
```

## Mocking External Services

Create type-safe mocks for external services that maintain the same interface as production implementations.

```typescript
import { handler, raw } from 'typed-handler';
import { z } from 'zod';

const emailRequestSchema = z.object({
  to: z.string().email(),
  subject: z.string().min(1),
  body: z.string().min(1),
  template: z.string().optional()
});

const mockEmailServiceHandler = handler()
  .input(emailRequestSchema)
  .use(async () => ({
    sentEmails: [] as Array<{
      to: string;
      subject: string;
      body: string;
      sentAt: string;
    }>
  }))
  .handle(async (input, ctx) => {
    const email = {
      to: input.to,
      subject: input.subject,
      body: input.body,
      sentAt: new Date().toISOString()
    };

    ctx.sentEmails.push(email);

    return {
      messageId: crypto.randomUUID(),
      sent: true,
      timestamp: email.sentAt
    };
  });

const mockEmailService = raw(mockEmailServiceHandler);

describe('Order Service', () => {
  let emailMock: ReturnType<typeof raw>;

  beforeEach(() => {
    emailMock = mockEmailService;
  });

  it('should send confirmation email when order is placed', async () => {
    const orderService = new OrderService({ emailService: emailMock });

    await orderService.placeOrder({
      customerId: 'user-123',
      items: [{ productId: 'prod-1', quantity: 2 }]
    });

    const emailResult = await emailMock({
      to: 'customer@example.com',
      subject: 'Order Confirmation',
      body: 'Your order has been placed'
    });

    expect(emailResult.success).toBe(true);
    expect(emailResult.data?.sent).toBe(true);
  });
});
```

## Test Data Generation

Build handlers that generate complex test data with relationships and constraints.

```typescript
import { handler, raw } from 'typed-handler';

interface OrderFixtureInput {
  userId?: string;
  itemCount?: number;
  status?: 'pending' | 'processing' | 'shipped' | 'delivered';
}

const createOrderFixtureHandler = handler<OrderFixtureInput>()
  .use(async (input) => ({
    userId: input.userId || crypto.randomUUID(),
    itemCount: input.itemCount || Math.floor(Math.random() * 5) + 1,
    status: input.status || 'pending'
  }))
  .use(async (input, ctx) => {
    const items = Array.from({ length: ctx.itemCount }, (_, i) => ({
      productId: `prod-${i + 1}`,
      name: `Product ${i + 1}`,
      quantity: Math.floor(Math.random() * 3) + 1,
      price: Math.floor(Math.random() * 10000) / 100
    }));

    const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

    return { items, total };
  })
  .handle(async (input, ctx) => ({
    id: crypto.randomUUID(),
    userId: ctx.userId,
    items: ctx.items,
    total: ctx.total,
    status: ctx.status,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }));

const createOrderFixture = raw(createOrderFixtureHandler);

describe('Order Processing', () => {
  it('should generate order with random items', async () => {
    const order = await createOrderFixture({});

    expect(order.success).toBe(true);
    expect(order.data?.items.length).toBeGreaterThan(0);
    expect(order.data?.total).toBeGreaterThan(0);
  });

  it('should generate order with specific item count', async () => {
    const order = await createOrderFixture({
      itemCount: 3,
      status: 'shipped'
    });

    expect(order.success).toBe(true);
    expect(order.data?.items.length).toBe(3);
    expect(order.data?.status).toBe('shipped');
  });
});
```

## Integration Testing Utilities

Create integration testing utilities that use handlers for consistent data setup and teardown.

```typescript
import { handler, raw } from 'typed-handler';
import { z } from 'zod';

const testEnvironmentSchema = z.object({
  testName: z.string(),
  resources: z.object({
    createUsers: z.number().optional(),
    createOrders: z.number().optional(),
    createProducts: z.number().optional()
  }).optional()
});

const setupTestEnvironmentHandler = handler()
  .input(testEnvironmentSchema)
  .use(async (input) => ({
    db: getTestDatabase(),
    testId: crypto.randomUUID(),
    createdResources: {
      users: [] as string[],
      orders: [] as string[],
      products: [] as string[]
    }
  }))
  .use(async (input, ctx) => {
    await ctx.db.query('BEGIN TRANSACTION');

    return { cleanupFns: [] as Array<() => Promise<void>> };
  })
  .handle(async (input, ctx) => {
    if (input.resources?.createUsers) {
      for (let i = 0; i < input.resources.createUsers; i++) {
        const userId = await ctx.db.users.create({
          email: `test-${ctx.testId}-user-${i}@example.com`,
          firstName: `Test${i}`,
          lastName: 'User'
        });
        ctx.createdResources.users.push(userId);
      }
    }

    if (input.resources?.createProducts) {
      for (let i = 0; i < input.resources.createProducts; i++) {
        const productId = await ctx.db.products.create({
          name: `Test Product ${i}`,
          price: 9.99,
          stock: 100
        });
        ctx.createdResources.products.push(productId);
      }
    }

    if (input.resources?.createOrders && ctx.createdResources.users.length > 0) {
      for (let i = 0; i < input.resources.createOrders; i++) {
        const orderId = await ctx.db.orders.create({
          userId: ctx.createdResources.users[0],
          items: [],
          total: 0
        });
        ctx.createdResources.orders.push(orderId);
      }
    }

    const cleanup = async () => {
      await ctx.db.query('ROLLBACK');
    };

    return {
      testId: ctx.testId,
      resources: ctx.createdResources,
      cleanup
    };
  });

const setupTestEnvironment = raw(setupTestEnvironmentHandler);

describe('E2E Order Flow', () => {
  let testEnv: Awaited<ReturnType<typeof setupTestEnvironment>>;

  beforeEach(async () => {
    const result = await setupTestEnvironment({
      testName: 'e2e-order-flow',
      resources: {
        createUsers: 2,
        createProducts: 5,
        createOrders: 0
      }
    });

    if (!result.success) {
      throw new Error('Failed to setup test environment');
    }

    testEnv = result;
  });

  afterEach(async () => {
    if (testEnv.data?.cleanup) {
      await testEnv.data.cleanup();
    }
  });

  it('should process order from created test data', async () => {
    expect(testEnv.data?.resources.users.length).toBe(2);
    expect(testEnv.data?.resources.products.length).toBe(5);
  });
});
```

The raw adapter provides structured data generation for testing while maintaining type safety and validation patterns that mirror production code.
