# Function-as-a-Service (FaaS)

Serverless functions benefit from structured data processing with validation and type safety. The raw adapter enables you to create type-safe FaaS handlers for platforms like AWS Lambda, Cloudflare Workers, and others, without coupling to any specific serverless framework.

## AWS Lambda Handler

Build type-safe Lambda handlers with minimal overhead using type-only mode.

```typescript
import { handler, raw } from 'typed-handler';
import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

interface ImageProcessingInput {
  bucket: string;
  key: string;
  operations: Array<{
    type: 'resize' | 'crop' | 'rotate';
    params: Record<string, unknown>;
  }>;
}

const processImageHandler = handler<ImageProcessingInput>()
  .use(async () => ({
    s3: getS3Client(),
    imageProcessor: getImageProcessor()
  }))
  .handle(async (input, ctx) => {
    const image = await ctx.s3.getObject({
      Bucket: input.bucket,
      Key: input.key
    });

    let processedImage = image.Body;

    for (const operation of input.operations) {
      processedImage = await ctx.imageProcessor.apply(
        processedImage,
        operation.type,
        operation.params
      );
    }

    const outputKey = `processed/${input.key}`;

    await ctx.s3.putObject({
      Bucket: input.bucket,
      Key: outputKey,
      Body: processedImage
    });

    return {
      bucket: input.bucket,
      key: outputKey,
      operations: input.operations.length
    };
  });

const processImage = raw(processImageHandler);

export async function handler(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  const body = JSON.parse(event.body || '{}');
  const result = await processImage(body);

  if (!result.success) {
    return {
      statusCode: 400,
      body: JSON.stringify({
        error: result.error?.message || 'Processing failed'
      })
    };
  }

  return {
    statusCode: 200,
    body: JSON.stringify(result.data)
  };
}
```

## Cloudflare Workers

Create type-safe Cloudflare Workers with Zod validation for edge computing.

```typescript
import { handler, raw } from 'typed-handler';
import { z } from 'zod';

const webhookSchema = z.object({
  event: z.enum(['user.created', 'user.updated', 'user.deleted']),
  userId: z.string().uuid(),
  timestamp: z.string().datetime(),
  data: z.record(z.unknown())
});

const processWebhookHandler = handler()
  .input(webhookSchema)
  .use(async (input) => ({
    kv: getKVNamespace(),
    eventTime: new Date(input.timestamp)
  }))
  .use(async (input, ctx) => {
    const user = await ctx.kv.get(`user:${input.userId}`);

    return {
      existingUser: user ? JSON.parse(user) : null
    };
  })
  .handle(async (input, ctx) => {
    switch (input.event) {
      case 'user.created': {
        await ctx.kv.put(
          `user:${input.userId}`,
          JSON.stringify(input.data),
          { expirationTtl: 86400 }
        );

        return {
          processed: true,
          event: input.event,
          userId: input.userId,
          action: 'created'
        };
      }

      case 'user.updated': {
        if (!ctx.existingUser) {
          throw new Error('User not found');
        }

        const updated = { ...ctx.existingUser, ...input.data };

        await ctx.kv.put(
          `user:${input.userId}`,
          JSON.stringify(updated),
          { expirationTtl: 86400 }
        );

        return {
          processed: true,
          event: input.event,
          userId: input.userId,
          action: 'updated'
        };
      }

      case 'user.deleted': {
        await ctx.kv.delete(`user:${input.userId}`);

        return {
          processed: true,
          event: input.event,
          userId: input.userId,
          action: 'deleted'
        };
      }
    }
  });

const processWebhook = raw(processWebhookHandler);

export default {
  async fetch(request: Request): Promise<Response> {
    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    const body = await request.json();
    const result = await processWebhook(body);

    if (!result.success) {
      return new Response(
        JSON.stringify({
          error: result.error?.message || 'Processing failed'
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    return new Response(JSON.stringify(result.data), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
```

## Serverless Platform Event Structures

Integrate with various serverless platform event structures while maintaining type safety.

```typescript
import { handler, raw } from 'typed-handler';
import { z } from 'zod';
import type { S3Event } from 'aws-lambda';

const s3EventSchema = z.object({
  bucket: z.string(),
  key: z.string(),
  size: z.number(),
  eventName: z.string()
});

const processS3EventHandler = handler()
  .input(s3EventSchema)
  .use(async () => ({
    s3: getS3Client(),
    rekognition: getRekognitionClient()
  }))
  .handle(async (input, ctx) => {
    if (!input.key.match(/\.(jpg|jpeg|png)$/i)) {
      return {
        skipped: true,
        reason: 'Not an image file'
      };
    }

    const labels = await ctx.rekognition.detectLabels({
      Image: {
        S3Object: {
          Bucket: input.bucket,
          Name: input.key
        }
      },
      MaxLabels: 10,
      MinConfidence: 70
    });

    const metadata = {
      labels: labels.Labels?.map(l => ({
        name: l.Name,
        confidence: l.Confidence
      })),
      processedAt: new Date().toISOString()
    };

    await ctx.s3.putObject({
      Bucket: input.bucket,
      Key: `${input.key}.metadata.json`,
      Body: JSON.stringify(metadata),
      ContentType: 'application/json'
    });

    return {
      processed: true,
      bucket: input.bucket,
      key: input.key,
      labelsDetected: metadata.labels?.length || 0
    };
  });

const processS3Event = raw(processS3EventHandler);

export async function handler(event: S3Event) {
  const results = [];

  for (const record of event.Records) {
    const s3Data = {
      bucket: record.s3.bucket.name,
      key: record.s3.object.key,
      size: record.s3.object.size,
      eventName: record.eventName
    };

    const result = await processS3Event(s3Data);

    if (!result.success) {
      console.error('Failed to process S3 event:', {
        bucket: s3Data.bucket,
        key: s3Data.key,
        error: result.error?.message
      });
      continue;
    }

    results.push(result.data);
  }

  return {
    statusCode: 200,
    body: JSON.stringify({
      processed: results.length,
      results
    })
  };
}
```

## Context and Configuration Management

Manage FaaS-specific context and configuration with middleware.

```typescript
import { handler, raw } from 'typed-handler';
import { z } from 'zod';

const notificationSchema = z.object({
  userId: z.string().uuid(),
  type: z.enum(['email', 'sms', 'push']),
  template: z.string(),
  variables: z.record(z.string())
});

const sendNotificationHandler = handler()
  .input(notificationSchema)
  .use(async () => {
    const config = {
      emailProvider: process.env.EMAIL_PROVIDER || 'sendgrid',
      smsProvider: process.env.SMS_PROVIDER || 'twilio',
      pushProvider: process.env.PUSH_PROVIDER || 'fcm'
    };

    return {
      config,
      region: process.env.AWS_REGION || 'us-east-1'
    };
  })
  .use(async (input, ctx) => {
    const userService = getUserService();
    const user = await userService.getUser(input.userId);

    if (!user) {
      throw new Error('User not found');
    }

    return {
      user,
      notificationService: getNotificationService(ctx.config)
    };
  })
  .handle(async (input, ctx) => {
    const message = await ctx.notificationService.renderTemplate(
      input.template,
      input.variables
    );

    const result = await ctx.notificationService.send({
      type: input.type,
      recipient: getRecipientAddress(ctx.user, input.type),
      message
    });

    return {
      sent: true,
      notificationId: result.id,
      userId: input.userId,
      type: input.type
    };
  });

const sendNotification = raw(sendNotificationHandler);

export async function handler(event: { body: string }) {
  const body = JSON.parse(event.body);
  const result = await sendNotification(body);

  if (!result.success) {
    return {
      statusCode: result.error?.name === 'ValidationError' ? 400 : 500,
      body: JSON.stringify({
        error: result.error?.message || 'Notification failed'
      })
    };
  }

  return {
    statusCode: 200,
    body: JSON.stringify(result.data)
  };
}

function getRecipientAddress(
  user: { email: string; phone: string; pushToken?: string },
  type: 'email' | 'sms' | 'push'
): string {
  switch (type) {
    case 'email':
      return user.email;
    case 'sms':
      return user.phone;
    case 'push':
      return user.pushToken || '';
  }
}
```

The raw adapter provides structured data processing for serverless functions while maintaining type safety and validation across different FaaS platforms.
