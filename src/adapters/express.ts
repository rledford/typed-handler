/**
 * Express adapter (placeholder)
 */

import type { Handler } from "../handler.js";

export function toExpress<TInput, TContext, TOutput>(handler: Handler<TInput, TContext, TOutput>) {
	throw new Error("Not implemented");
}
