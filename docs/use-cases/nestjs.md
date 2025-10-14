# NestJS Integration

**Compatible with NestJS v8 or later**

## Table of Contents

- [Overview](#overview)
- [When to Use typed-handler with NestJS](#when-to-use-typed-handler-with-nestjs)
- [Event Handlers](#event-handlers)
- [Queue Processors](#queue-processors)
- [Microservices Message Handlers](#microservices-message-handlers)
- [Background Jobs](#background-jobs)
- [Error Handling](#error-handling)
- [Testing](#testing)

## Overview

While NestJS provides excellent built-in support for HTTP request handling through decorators and ValidationPipe, typed-handler shines in areas where NestJS's HTTP-centric features don't naturally fit: **event-driven systems, message queues, microservices, and background jobs**.

**Why use typed-handler in NestJS?**

- **Event Handlers**: NestJS's `@OnEvent()` doesn't validate event payloads - typed-handler provides automatic validation and type inference
- **Queue Processors**: Bull/BullMQ jobs need validated data and type-safe handling - typed-handler's fluent API is perfect for this
- **Microservices**: Message patterns benefit from typed-handler's validation and context management
- **Background Jobs**: Async tasks need the same validation rigor as HTTP endpoints - typed-handler provides it without framework coupling

**Key Benefits:**

- **Zero Dependencies**: No conflicts with the NestJS ecosystem
- **Type Safety**: Full type inference from validation schemas through to handler logic
- **Validation-Agnostic**: Use Zod, Joi, Yup, or any validator alongside NestJS's class-validator
- **DI Integration**: Handlers work seamlessly as injectable services
- **Testability**: Handler logic is isolated and easy to unit test

## When to Use typed-handler with NestJS

**✅ Great Fit:**

- Event handlers (`@OnEvent()`) that need payload validation
- Queue job processors (Bull, BullMQ) with complex validation
- Microservice message handlers with typed payloads
- Background tasks that process external data
- CRON jobs that need validated input
- Saga/workflow steps with validated state transitions

**❌ Not Recommended:**

- HTTP controllers - NestJS's built-in decorators and ValidationPipe are better suited
- GraphQL resolvers - Use NestJS's built-in validation and decorators
- Simple event handlers without validation needs

## Event Handlers

NestJS's event system (`@nestjs/event-emitter`) doesn't validate event payloads. typed-handler adds type-safe validation and processing.

### Basic Event Handler

```typescript
import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { z } from 'zod';
import { handler } from 'typed-handler';

const userRegisteredSchema = z.object({
  userId: z.string().uuid(),
  email: z.string().email(),
  name: z.string(),
  registeredAt: z.string().datetime(),
});

@Injectable()
export class UserEventsService {
  constructor(
    private readonly emailService: EmailService,
    private readonly analyticsService: AnalyticsService,
    private readonly logger: LoggerService,
  ) {}

  private sendWelcomeEmailHandler = handler()
    .input(userRegisteredSchema)
    .use(async () => ({
      logger: this.logger,
      emailService: this.emailService,
    }))
    .handle(async (event, ctx) => {
      ctx.logger.log(`Sending welcome email to ${event.email}`);

      await ctx.emailService.send({
        to: event.email,
        subject: 'Welcome!',
        template: 'welcome',
        data: { name: event.name },
      });

      return { sent: true, userId: event.userId };
    });

  @OnEvent('user.registered')
  async handleUserRegistered(payload: unknown) {
    try {
      const result = await this.sendWelcomeEmailHandler.execute(payload);
      this.logger.log(`Welcome email sent for user ${result.userId}`);
    } catch (error) {
      if (error instanceof ValidationError) {
        this.logger.error(`Invalid user.registered event payload: ${error.message}`);
      } else {
        throw error;
      }
    }
  }
}
```

### Multi-Step Event Handler with Context

```typescript
import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { z } from 'zod';
import { handler } from 'typed-handler';

const orderPlacedSchema = z.object({
  orderId: z.string().uuid(),
  userId: z.string().uuid(),
  items: z.array(z.object({
    productId: z.string(),
    quantity: z.number().positive(),
    price: z.number().positive(),
  })),
  total: z.number().positive(),
});

@Injectable()
export class OrderEventsService {
  constructor(
    private readonly orderRepo: OrderRepository,
    private readonly inventoryService: InventoryService,
    private readonly paymentService: PaymentService,
    private readonly notificationService: NotificationService,
  ) {}

  private processOrderHandler = handler()
    .input(orderPlacedSchema)
    .use(async (event) => {
      const order = await this.orderRepo.findById(event.orderId);
      if (!order) throw new Error('Order not found');
      return { order };
    })
    .use(async (event, ctx) => {
      await this.inventoryService.reserve(event.items);
      return { inventoryReserved: true };
    })
    .use(async (event, ctx) => {
      const payment = await this.paymentService.charge({
        userId: event.userId,
        amount: event.total,
        orderId: event.orderId,
      });
      return { payment };
    })
    .handle(async (event, ctx) => {
      await this.orderRepo.markPaid(event.orderId, ctx.payment.transactionId);

      await this.notificationService.sendOrderConfirmation({
        userId: event.userId,
        orderId: event.orderId,
        total: event.total,
      });

      return {
        orderId: event.orderId,
        status: 'processed',
        transactionId: ctx.payment.transactionId,
      };
    });

  @OnEvent('order.placed')
  async handleOrderPlaced(payload: unknown) {
    const result = await this.processOrderHandler.execute(payload);
    return result;
  }
}
```

## Queue Processors

Bull and BullMQ are popular queue libraries for NestJS. typed-handler provides type-safe job processing with validation.

### Bull Queue Processor

```typescript
import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import { handler } from 'typed-handler';

const sendEmailJobSchema = z.object({
  to: z.string().email(),
  subject: z.string(),
  template: z.string(),
  data: z.record(z.unknown()),
  priority: z.enum(['low', 'normal', 'high']).default('normal'),
  retryCount: z.number().default(0),
});

@Processor('email')
@Injectable()
export class EmailQueueProcessor {
  constructor(
    private readonly emailService: EmailService,
    private readonly templateService: TemplateService,
    private readonly logger: LoggerService,
  ) {}

  private sendEmailHandler = handler()
    .input(sendEmailJobSchema)
    .use(async (input) => ({
      startTime: Date.now(),
      jobId: Math.random().toString(36),
    }))
    .use(async (input, ctx) => {
      const template = await this.templateService.render(
        input.template,
        input.data,
      );
      return { renderedTemplate: template };
    })
    .handle(async (input, ctx) => {
      this.logger.log(
        `Sending email to ${input.to} (priority: ${input.priority}, job: ${ctx.jobId})`,
      );

      await this.emailService.send({
        to: input.to,
        subject: input.subject,
        html: ctx.renderedTemplate,
      });

      const duration = Date.now() - ctx.startTime;
      this.logger.log(`Email sent in ${duration}ms (job: ${ctx.jobId})`);

      return {
        sent: true,
        to: input.to,
        duration,
        jobId: ctx.jobId,
      };
    });

  @Process('send')
  async handleSendEmail(job: Job) {
    try {
      const result = await this.sendEmailHandler.execute(job.data);
      return result;
    } catch (error) {
      if (error instanceof ValidationError) {
        this.logger.error(`Invalid email job data for job ${job.id}: ${error.message}`);
        throw error;
      }
      throw error;
    }
  }
}
```

### BullMQ with Complex Validation

```typescript
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import { handler } from 'typed-handler';

const imageProcessingJobSchema = z.object({
  imageUrl: z.string().url(),
  userId: z.string().uuid(),
  operations: z.array(
    z.discriminatedUnion('type', [
      z.object({
        type: z.literal('resize'),
        width: z.number().positive(),
        height: z.number().positive(),
      }),
      z.object({
        type: z.literal('crop'),
        x: z.number(),
        y: z.number(),
        width: z.number().positive(),
        height: z.number().positive(),
      }),
      z.object({
        type: z.literal('filter'),
        filter: z.enum(['grayscale', 'sepia', 'blur', 'sharpen']),
      }),
    ]),
  ),
  outputFormat: z.enum(['jpeg', 'png', 'webp']).default('jpeg'),
  quality: z.number().min(1).max(100).default(80),
});

@Processor('image-processing')
@Injectable()
export class ImageProcessingProcessor extends WorkerHost {
  constructor(
    private readonly imageService: ImageService,
    private readonly storageService: StorageService,
    private readonly logger: LoggerService,
  ) {
    super();
  }

  private processImageHandler = handler()
    .input(imageProcessingJobSchema)
    .use(async (input) => {
      const image = await this.imageService.download(input.imageUrl);
      return { image, processingSteps: [] as string[] };
    })
    .use(async (input, ctx) => {
      let processedImage = ctx.image;

      for (const operation of input.operations) {
        switch (operation.type) {
          case 'resize':
            processedImage = await this.imageService.resize(
              processedImage,
              operation.width,
              operation.height,
            );
            ctx.processingSteps.push(
              `resize:${operation.width}x${operation.height}`,
            );
            break;
          case 'crop':
            processedImage = await this.imageService.crop(
              processedImage,
              operation.x,
              operation.y,
              operation.width,
              operation.height,
            );
            ctx.processingSteps.push(
              `crop:${operation.x},${operation.y},${operation.width}x${operation.height}`,
            );
            break;
          case 'filter':
            processedImage = await this.imageService.applyFilter(
              processedImage,
              operation.filter,
            );
            ctx.processingSteps.push(`filter:${operation.filter}`);
            break;
        }
      }

      return { processedImage };
    })
    .handle(async (input, ctx) => {
      const outputBuffer = await this.imageService.encode(
        ctx.processedImage,
        input.outputFormat,
        input.quality,
      );

      const outputUrl = await this.storageService.upload({
        buffer: outputBuffer,
        userId: input.userId,
        contentType: `image/${input.outputFormat}`,
      });

      this.logger.log(
        `Image processed: ${ctx.processingSteps.join(' -> ')} -> ${outputUrl}`,
      );

      return {
        originalUrl: input.imageUrl,
        processedUrl: outputUrl,
        operations: ctx.processingSteps,
        format: input.outputFormat,
        quality: input.quality,
      };
    });

  async process(job: Job) {
    return this.processImageHandler.execute(job.data);
  }
}
```

## Microservices Message Handlers

NestJS microservices use message patterns. typed-handler adds validation and type safety.

### TCP Microservice Handler

```typescript
import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { z } from 'zod';
import { handler } from 'typed-handler';

const createUserCommandSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2),
  password: z.string().min(8),
  organizationId: z.string().uuid(),
});

@Controller()
export class UserMicroserviceController {
  constructor(
    private readonly userRepo: UserRepository,
    private readonly passwordService: PasswordService,
    private readonly logger: LoggerService,
  ) {}

  private createUserHandler = handler()
    .input(createUserCommandSchema)
    .use(async (input) => {
      const exists = await this.userRepo.existsByEmail(input.email);
      if (exists) throw new Error('User already exists');
      return {};
    })
    .use(async (input) => {
      const passwordHash = await this.passwordService.hash(input.password);
      return { passwordHash };
    })
    .handle(async (input, ctx) => {
      const user = await this.userRepo.create({
        email: input.email,
        name: input.name,
        passwordHash: ctx.passwordHash,
        organizationId: input.organizationId,
      });

      this.logger.log(`User created: ${user.id}`);

      return {
        id: user.id,
        email: user.email,
        name: user.name,
        organizationId: user.organizationId,
        createdAt: user.createdAt,
      };
    });

  @MessagePattern({ cmd: 'create_user' })
  async createUser(@Payload() data: unknown) {
    return this.createUserHandler.execute(data);
  }
}
```

### Event Pattern Handler

```typescript
import { Controller } from '@nestjs/common';
import { EventPattern, Payload, Ctx, RmqContext } from '@nestjs/microservices';
import { z } from 'zod';
import { handler } from 'typed-handler';

const orderCreatedEventSchema = z.object({
  orderId: z.string().uuid(),
  userId: z.string().uuid(),
  total: z.number().positive(),
  items: z.array(z.object({
    productId: z.string(),
    quantity: z.number().positive(),
  })),
  createdAt: z.string().datetime(),
});

@Controller()
export class InventoryMicroserviceController {
  constructor(
    private readonly inventoryService: InventoryService,
    private readonly logger: LoggerService,
  ) {}

  private reserveInventoryHandler = handler()
    .input(orderCreatedEventSchema)
    .use(async (event) => ({
      eventId: Math.random().toString(36),
      processedAt: new Date(),
    }))
    .use(async (event, ctx) => {
      for (const item of event.items) {
        const available = await this.inventoryService.checkAvailability(
          item.productId,
          item.quantity,
        );
        if (!available) {
          throw new Error(
            `Insufficient inventory for product ${item.productId}`,
          );
        }
      }
      return {};
    })
    .handle(async (event, ctx) => {
      const reservations = await Promise.all(
        event.items.map((item) =>
          this.inventoryService.reserve(
            item.productId,
            item.quantity,
            event.orderId,
          ),
        ),
      );

      this.logger.log(
        `Inventory reserved for order ${event.orderId} (event: ${ctx.eventId})`,
      );

      return {
        orderId: event.orderId,
        reservations,
        eventId: ctx.eventId,
        processedAt: ctx.processedAt,
      };
    });

  @EventPattern('order.created')
  async handleOrderCreated(@Payload() data: unknown, @Ctx() context: RmqContext) {
    const channel = context.getChannelRef();
    const originalMsg = context.getMessage();

    try {
      const result = await this.reserveInventoryHandler.execute(data);
      channel.ack(originalMsg);
      return result;
    } catch (error) {
      if (error instanceof ValidationError) {
        this.logger.error(`Invalid order.created event: ${error.message}`);
        channel.ack(originalMsg);
      } else {
        channel.nack(originalMsg);
      }
      throw error;
    }
  }
}
```

## Background Jobs

CRON jobs and scheduled tasks benefit from typed-handler's validation and type safety.

### CRON Job with Validation

```typescript
import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { z } from 'zod';
import { handler } from 'typed-handler';

const reportConfigSchema = z.object({
  startDate: z.date(),
  endDate: z.date(),
  includeDetails: z.boolean().default(false),
  format: z.enum(['pdf', 'csv', 'json']).default('pdf'),
});

@Injectable()
export class ReportingService {
  constructor(
    private readonly analyticsService: AnalyticsService,
    private readonly reportGenerator: ReportGenerator,
    private readonly emailService: EmailService,
    private readonly configService: ConfigService,
  ) {}

  private generateDailyReportHandler = handler()
    .input(reportConfigSchema)
    .use(async () => ({
      startTime: Date.now(),
      reportId: Math.random().toString(36),
    }))
    .use(async (config, ctx) => {
      const data = await this.analyticsService.getData(
        config.startDate,
        config.endDate,
        config.includeDetails,
      );
      return { data };
    })
    .use(async (config, ctx) => {
      const report = await this.reportGenerator.generate({
        data: ctx.data,
        format: config.format,
        includeDetails: config.includeDetails,
      });
      return { report };
    })
    .handle(async (config, ctx) => {
      const recipients = this.configService.get('REPORT_RECIPIENTS').split(',');

      await this.emailService.sendWithAttachment({
        to: recipients,
        subject: `Daily Report - ${config.startDate.toISOString().split('T')[0]}`,
        body: 'Please find attached the daily report.',
        attachment: {
          filename: `report-${config.startDate.toISOString().split('T')[0]}.${config.format}`,
          content: ctx.report,
        },
      });

      const duration = Date.now() - ctx.startTime;

      return {
        reportId: ctx.reportId,
        format: config.format,
        duration,
        recipients: recipients.length,
      };
    });

  @Cron(CronExpression.EVERY_DAY_AT_6AM)
  async generateDailyReport() {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const config = {
      startDate: yesterday,
      endDate: today,
      includeDetails: false,
      format: 'pdf' as const,
    };

    const result = await this.generateDailyReportHandler.execute(config);
    console.log(`Daily report generated: ${result.reportId} in ${result.duration}ms`);
  }
}
```

## Error Handling

typed-handler throws `ValidationError` for invalid data. Handle these appropriately in your NestJS services.

### Global Exception Filter

```typescript
import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpStatus,
} from '@nestjs/common';
import { ValidationError } from 'typed-handler';

@Catch(ValidationError)
export class ValidationErrorFilter implements ExceptionFilter {
  catch(exception: ValidationError, host: ArgumentsHost) {
    const contextType = host.getType();

    if (contextType === 'http') {
      const ctx = host.switchToHttp();
      const response = ctx.getResponse();

      response.status(HttpStatus.BAD_REQUEST).json({
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Validation failed',
        errors: exception.errors,
        timestamp: new Date().toISOString(),
      });
    } else {
      console.error('ValidationError in non-HTTP context:', exception.errors);
      throw exception;
    }
  }
}
```

### Service-Level Error Handling

```typescript
@Injectable()
export class OrderEventsService {
  private readonly logger = new Logger(OrderEventsService.name);

  @OnEvent('order.placed')
  async handleOrderPlaced(payload: unknown) {
    try {
      const result = await this.processOrderHandler.execute(payload);
      this.logger.log(`Order processed: ${result.orderId}`);
      return result;
    } catch (error) {
      if (error instanceof ValidationError) {
        this.logger.error(
          `Invalid order.placed event payload: ${JSON.stringify(error.errors)}`,
        );
        return;
      }

      if (error instanceof HandlerError) {
        this.logger.error(`Order processing failed: ${error.message}`);
        throw error;
      }

      throw error;
    }
  }
}
```

## Testing

typed-handler's isolation from framework code makes testing straightforward.

### Unit Testing Handlers

```typescript
import { Test } from '@nestjs/testing';
import { handler } from 'typed-handler';
import { z } from 'zod';

describe('UserEventsService', () => {
  let service: UserEventsService;
  let emailService: EmailService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        UserEventsService,
        {
          provide: EmailService,
          useValue: {
            send: jest.fn(),
          },
        },
        {
          provide: LoggerService,
          useValue: {
            log: jest.fn(),
            error: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<UserEventsService>(UserEventsService);
    emailService = module.get<EmailService>(EmailService);
  });

  it('should send welcome email for valid user.registered event', async () => {
    const event = {
      userId: '123e4567-e89b-12d3-a456-426614174000',
      email: 'test@example.com',
      name: 'Test User',
      registeredAt: new Date().toISOString(),
    };

    await service.handleUserRegistered(event);

    expect(emailService.send).toHaveBeenCalledWith({
      to: 'test@example.com',
      subject: 'Welcome!',
      template: 'welcome',
      data: { name: 'Test User' },
    });
  });

  it('should reject invalid user.registered event payload', async () => {
    const invalidEvent = {
      userId: 'not-a-uuid',
      email: 'invalid-email',
      name: '',
    };

    await service.handleUserRegistered(invalidEvent);

    expect(emailService.send).not.toHaveBeenCalled();
  });
});
```

### Testing Handlers in Isolation

```typescript
describe('processOrderHandler', () => {
  it('should process valid order event', async () => {
    const mockOrderRepo = {
      findById: jest.fn().mockResolvedValue({ id: 'order-1', status: 'pending' }),
      markPaid: jest.fn(),
    };

    const mockPaymentService = {
      charge: jest.fn().mockResolvedValue({ transactionId: 'txn-123' }),
    };

    const testHandler = handler()
      .input(orderPlacedSchema)
      .use(async (event) => {
        const order = await mockOrderRepo.findById(event.orderId);
        return { order };
      })
      .use(async (event, ctx) => {
        const payment = await mockPaymentService.charge({
          userId: event.userId,
          amount: event.total,
          orderId: event.orderId,
        });
        return { payment };
      })
      .handle(async (event, ctx) => {
        await mockOrderRepo.markPaid(event.orderId, ctx.payment.transactionId);
        return { orderId: event.orderId, status: 'processed' };
      });

    const event = {
      orderId: 'order-1',
      userId: 'user-1',
      items: [{ productId: 'prod-1', quantity: 2, price: 10.0 }],
      total: 20.0,
    };

    const result = await testHandler.execute(event);

    expect(result).toEqual({ orderId: 'order-1', status: 'processed' });
    expect(mockOrderRepo.findById).toHaveBeenCalledWith('order-1');
    expect(mockPaymentService.charge).toHaveBeenCalledWith({
      userId: 'user-1',
      amount: 20.0,
      orderId: 'order-1',
    });
    expect(mockOrderRepo.markPaid).toHaveBeenCalledWith('order-1', 'txn-123');
  });
});
```
