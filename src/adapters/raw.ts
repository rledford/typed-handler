/**
 * Raw adapter (placeholder)
 */

import type { Handler } from "../handler.js";

export interface RawHandler<TInput, TContext, TOutput> {
	execute(input: TInput, context?: Partial<TContext>): Promise<TOutput>;
}

export function toRaw<TInput, TContext, TOutput>(
	handler: Handler<TInput, TContext, TOutput>,
): RawHandler<TInput, TContext, TOutput> {
	throw new Error("Not implemented");
}
