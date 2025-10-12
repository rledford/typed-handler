/**
 * Hono adapter (placeholder)
 */

import type { Handler } from "../handler.js";

// biome-ignore lint/suspicious/noExplicitAny: Hono types not available yet
export function toHono<TInput, TContext, TOutput>(
	handler: Handler<TInput, TContext, TOutput>,
): any {
	throw new Error("Not implemented");
}
