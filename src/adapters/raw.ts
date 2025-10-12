import type { Handler } from "../handler.js";

export interface RawHandler<TInput, TContext, TOutput> {
	execute(input: TInput, context?: Partial<TContext>): Promise<TOutput>;
}

export function toRaw<TInput, TContext, TOutput>(
	handler: Handler<TInput, TContext, TOutput>,
): RawHandler<TInput, TContext, TOutput> {
	return {
		execute: (input: TInput, context?: Partial<TContext>) =>
			handler.execute(input, context as TContext),
	};
}
