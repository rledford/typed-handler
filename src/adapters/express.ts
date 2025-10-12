/**
 * Express adapter (placeholder)
 */

import type { Handler } from "../handler.js";

// biome-ignore lint/suspicious/noExplicitAny: Express types not available yet
export function toExpress<TInput, TContext, TOutput>(
	handler: Handler<TInput, TContext, TOutput>,
): any {
	throw new Error("Not implemented");
}
