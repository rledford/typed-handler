/**
 * Core type definitions for typed-handler
 */

// Handler function type
export type HandlerFunction<TInput, TContext, TOutput> = (
	input: TInput,
	context: TContext,
) => Promise<TOutput> | TOutput;

// Middleware type
export type Middleware<TContext, TNewContext = object> = (
	req: unknown,
	context: TContext,
) => Promise<TNewContext> | TNewContext;

// Validator adapter interface
export interface ValidatorAdapter<T> {
	parse: (schema: unknown, data: unknown) => Promise<T> | T;
	detect?: (schema: unknown) => boolean;
	name?: string;
}

// Multi-input type for handling different request parts
export type MultiInput<T = unknown> = {
	body?: T;
	query?: T;
	params?: T;
	headers?: T;
};

// Logger interface
export interface Logger {
	error(message: string, meta?: unknown): void;
	warn(message: string, meta?: unknown): void;
	info(message: string, meta?: unknown): void;
	debug(message: string, meta?: unknown): void;
}

// Handler configuration
export interface HandlerConfig {
	validateInput: boolean;
	validateOutput: boolean;
	logger: Logger;
}

// Type inference helpers
export type InferInput<V> = V extends { parse: (data: unknown) => infer T }
	? T
	: V extends { parseAsync: (data: unknown) => Promise<infer T> }
		? T
		: V extends { validate: (data: unknown) => { value: infer T } }
			? T
			: V extends { validateAsync: (data: unknown) => Promise<{ value: infer T }> }
				? T
				: V extends { validateSync: (data: unknown) => infer T }
					? T
					: never;

export type InferOutput<V> = InferInput<V>;

// Extract input from multi-input or single input
export type ExtractedInput<T> = T extends MultiInput
	? {
			[K in keyof T]: T[K] extends unknown ? InferInput<T[K]> : never;
		}
	: InferInput<T>;

// Context merging
export type MergeContext<TContext, TNewContext> = TContext & TNewContext;
