/**
 * Main Handler class for building type-safe request handlers
 */

import { getConfig } from "./config.js";
import type { HandlerConfig, HandlerFunction, Middleware, ValidatorAdapter } from "./types.js";

export class Handler<TInput = unknown, TContext = object, TOutput = unknown> {
	private inputValidator?: {
		schema: unknown;
		adapter?: ValidatorAdapter<unknown>;
		isMultiInput: boolean;
	};

	private outputValidator?: {
		schema: unknown;
		adapter?: ValidatorAdapter<unknown>;
	};

	// biome-ignore lint/suspicious/noExplicitAny: Middleware chain requires flexibility
	private middlewares: Middleware<any, any>[] = [];
	private handlerFn?: HandlerFunction<TInput, TContext, TOutput>;
	private config: HandlerConfig;

	constructor(config?: Partial<HandlerConfig>) {
		this.config = { ...getConfig(), ...config };
	}

	// Placeholder methods - to be implemented
	input<T>(schema?: unknown, adapter?: ValidatorAdapter<T>): Handler<T, TContext, TOutput> {
		throw new Error("Not implemented");
	}

	use<TNewContext>(
		middleware: Middleware<TContext, TNewContext>,
	): Handler<TInput, TContext & TNewContext, TOutput> {
		throw new Error("Not implemented");
	}

	handle<TOut>(fn: HandlerFunction<TInput, TContext, TOut>): Handler<TInput, TContext, TOut> {
		throw new Error("Not implemented");
	}

	output<T>(schema?: unknown, adapter?: ValidatorAdapter<T>): Handler<TInput, TContext, T> {
		throw new Error("Not implemented");
	}

	async execute(input: unknown, context?: Partial<TContext>): Promise<TOutput> {
		throw new Error("Not implemented");
	}
}

/**
 * Factory function to create a new handler
 */
export function handler<TContext = object>(
	config?: Partial<HandlerConfig>,
): Handler<unknown, TContext, unknown> {
	return new Handler<unknown, TContext, unknown>(config);
}
