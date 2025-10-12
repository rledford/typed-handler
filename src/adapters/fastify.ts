/**
 * Fastify adapter (placeholder)
 */

import type { Handler } from "../handler.js";

// biome-ignore lint/suspicious/noExplicitAny: Fastify types not available yet
export function toFastify<TInput, TContext, TOutput>(
	handler: Handler<TInput, TContext, TOutput>,
): any {
	throw new Error("Not implemented");
}
