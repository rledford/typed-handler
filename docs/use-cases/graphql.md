# GraphQL Resolvers

GraphQL resolvers benefit from structured argument processing, validation, and type-safe context management. The raw adapter enables you to build type-safe resolvers with validation, authentication middleware, and dataloader integration without coupling to any specific GraphQL server implementation.

## Type-Safe Resolver with Validation

Build GraphQL resolvers with input validation and type inference using Zod.

```typescript
import { handler, raw } from 'typed-handler';
import { z } from 'zod';

const createPostArgsSchema = z.object({
  title: z.string().min(3).max(200),
  content: z.string().min(10),
  tags: z.array(z.string()).max(5).optional(),
  published: z.boolean().default(false)
});

const createPostHandler = handler()
  .input(createPostArgsSchema)
  .use(async (input, ctx: { user?: { id: string; role: string } }) => {
    if (!ctx.user) {
      throw new Error('Authentication required');
    }

    return {
      userId: ctx.user.id,
      db: getDatabase()
    };
  })
  .handle(async (input, ctx) => {
    const post = await ctx.db.posts.create({
      title: input.title,
      content: input.content,
      tags: input.tags || [],
      published: input.published,
      authorId: ctx.userId,
      createdAt: new Date().toISOString()
    });

    return {
      id: post.id,
      title: post.title,
      content: post.content,
      tags: post.tags,
      published: post.published,
      createdAt: post.createdAt,
      author: {
        id: ctx.userId
      }
    };
  });

const createPostResolver = raw(createPostHandler);

const resolvers = {
  Mutation: {
    createPost: async (
      _parent: unknown,
      args: unknown,
      context: { user?: { id: string; role: string } }
    ) => {
      const result = await createPostResolver(args, context);

      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to create post');
      }

      return result.data;
    }
  }
};
```

## Field Resolver with Context

Create field resolvers that leverage context for authentication, dataloaders, and service access.

```typescript
import { handler, raw } from 'typed-handler';
import { z } from 'zod';
import type DataLoader from 'dataloader';

interface GraphQLContext {
  user?: { id: string; role: string };
  loaders: {
    users: DataLoader<string, User>;
    posts: DataLoader<string, Post>;
    comments: DataLoader<string, Comment[]>;
  };
}

const postCommentsArgsSchema = z.object({
  postId: z.string().uuid(),
  limit: z.number().min(1).max(100).default(10),
  offset: z.number().min(0).default(0)
});

const postCommentsHandler = handler()
  .input(postCommentsArgsSchema)
  .use(async (input, ctx: GraphQLContext) => ({
    loaders: ctx.loaders
  }))
  .handle(async (input, ctx) => {
    const comments = await ctx.loaders.comments.load(input.postId);

    const paginated = comments
      .slice(input.offset, input.offset + input.limit);

    return {
      comments: paginated,
      hasMore: comments.length > input.offset + input.limit,
      total: comments.length
    };
  });

const postCommentsResolver = raw(postCommentsHandler);

const resolvers = {
  Post: {
    comments: async (
      parent: { id: string },
      args: { limit?: number; offset?: number },
      context: GraphQLContext
    ) => {
      const result = await postCommentsResolver(
        {
          postId: parent.id,
          limit: args.limit,
          offset: args.offset
        },
        context
      );

      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to load comments');
      }

      return result.data.comments;
    }
  }
};
```

## Authentication and Authorization Middleware

Implement authentication and authorization patterns using middleware.

```typescript
import { handler, raw } from 'typed-handler';
import { z } from 'zod';

const updateUserArgsSchema = z.object({
  userId: z.string().uuid(),
  input: z.object({
    firstName: z.string().min(1).optional(),
    lastName: z.string().min(1).optional(),
    bio: z.string().max(500).optional()
  })
});

const updateUserHandler = handler()
  .input(updateUserArgsSchema)
  .use(async (input, ctx: GraphQLContext) => {
    if (!ctx.user) {
      throw new Error('Authentication required');
    }

    return {
      currentUser: ctx.user
    };
  })
  .use(async (input, ctx) => {
    if (ctx.currentUser.id !== input.userId && ctx.currentUser.role !== 'admin') {
      throw new Error('Unauthorized: Cannot update other users');
    }

    return {
      db: getDatabase()
    };
  })
  .handle(async (input, ctx) => {
    const user = await ctx.db.users.findById(input.userId);

    if (!user) {
      throw new Error('User not found');
    }

    const updated = await ctx.db.users.update(input.userId, {
      firstName: input.input.firstName ?? user.firstName,
      lastName: input.input.lastName ?? user.lastName,
      bio: input.input.bio ?? user.bio,
      updatedAt: new Date().toISOString()
    });

    return {
      id: updated.id,
      firstName: updated.firstName,
      lastName: updated.lastName,
      bio: updated.bio,
      updatedAt: updated.updatedAt
    };
  });

const updateUserResolver = raw(updateUserHandler);

const resolvers = {
  Mutation: {
    updateUser: async (
      _parent: unknown,
      args: unknown,
      context: GraphQLContext
    ) => {
      const result = await updateUserResolver(args, context);

      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to update user');
      }

      return result.data;
    }
  }
};
```

## Complex Resolver with Multiple Data Sources

Build resolvers that aggregate data from multiple sources with type safety.

```typescript
import { handler, raw } from 'typed-handler';
import { z } from 'zod';

const userDashboardArgsSchema = z.object({
  userId: z.string().uuid(),
  dateRange: z.object({
    start: z.string().datetime(),
    end: z.string().datetime()
  }).optional()
});

const userDashboardHandler = handler()
  .input(userDashboardArgsSchema)
  .use(async (input, ctx: GraphQLContext) => {
    if (!ctx.user) {
      throw new Error('Authentication required');
    }

    if (ctx.user.id !== input.userId && ctx.user.role !== 'admin') {
      throw new Error('Unauthorized');
    }

    return {
      currentUser: ctx.user,
      loaders: ctx.loaders
    };
  })
  .use(async (input, ctx) => ({
    db: getDatabase(),
    analyticsService: getAnalyticsService()
  }))
  .handle(async (input, ctx) => {
    const dateRange = input.dateRange || {
      start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      end: new Date().toISOString()
    };

    const [user, posts, stats, activity] = await Promise.all([
      ctx.loaders.users.load(input.userId),
      ctx.db.posts.findByAuthor(input.userId, {
        createdAfter: dateRange.start,
        createdBefore: dateRange.end
      }),
      ctx.analyticsService.getUserStats(input.userId, dateRange),
      ctx.db.activity.findByUser(input.userId, {
        limit: 10,
        after: dateRange.start
      })
    ]);

    return {
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email
      },
      posts: {
        total: posts.length,
        published: posts.filter(p => p.published).length,
        drafts: posts.filter(p => !p.published).length,
        items: posts
      },
      stats: {
        views: stats.views,
        likes: stats.likes,
        comments: stats.comments,
        followers: stats.followers
      },
      recentActivity: activity.map(a => ({
        type: a.type,
        description: a.description,
        timestamp: a.timestamp
      }))
    };
  });

const userDashboardResolver = raw(userDashboardHandler);

const resolvers = {
  Query: {
    userDashboard: async (
      _parent: unknown,
      args: unknown,
      context: GraphQLContext
    ) => {
      const result = await userDashboardResolver(args, context);

      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to load dashboard');
      }

      return result.data;
    }
  }
};
```

The raw adapter provides structured argument processing for GraphQL resolvers while maintaining type safety, validation, and context management patterns throughout your GraphQL API.
