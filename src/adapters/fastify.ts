/**
 * Fastify adapter (placeholder)
 */

import type { Handler } from "../handler.js";

export function toFastify<TInput, TContext, TOutput>(handler: Handler<TInput, TContext, TOutput>) {
	throw new Error("Not implemented");
}
