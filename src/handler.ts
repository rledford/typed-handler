/**
 * Main Handler class for building type-safe request handlers
 */

import { getConfig } from "./config.js";
import { ValidationError } from "./errors/index.js";
import type { HandlerConfig, HandlerFunction, Middleware, ValidatorAdapter } from "./types.js";
import { detectValidator } from "./validators/index.js";

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

	private clone(): Handler<TInput, TContext, TOutput> {
		const newHandler = new Handler<TInput, TContext, TOutput>(this.config);
		newHandler.inputValidator = this.inputValidator;
		newHandler.outputValidator = this.outputValidator;
		newHandler.middlewares = [...this.middlewares];
		newHandler.handlerFn = this.handlerFn;
		return newHandler;
	}

	private detectMultiInput(schema: unknown): boolean {
		if (!schema || typeof schema !== "object" || Array.isArray(schema)) {
			return false;
		}

		const obj = schema as Record<string, unknown>;
		const hasNoMethods = !Object.keys(obj).some((key) => typeof obj[key] === "function");
		if (!hasNoMethods) {
			return false;
		}

		const multiInputKeys = ["body", "query", "params", "headers"];
		return multiInputKeys.some((key) => key in obj);
	}

	private async validateInput(data: unknown): Promise<TInput> {
		if (!this.inputValidator) {
			return data as TInput;
		}

		try {
			if (this.inputValidator.isMultiInput) {
				const schema = this.inputValidator.schema as Record<string, unknown>;
				const input = data as Record<string, unknown>;
				const validated: Record<string, unknown> = {};

				for (const key of ["body", "query", "params", "headers"]) {
					if (key in schema) {
						const partSchema = schema[key];
						const partData = input[key];
						const adapter = this.inputValidator.adapter || detectValidator(partSchema);

						if (adapter) {
							validated[key] = await adapter.parse(partSchema, partData);
						} else {
							validated[key] = partData;
						}
					}
				}

				return validated as TInput;
			}

			const adapter = this.inputValidator.adapter || detectValidator(this.inputValidator.schema);

			if (adapter) {
				return (await adapter.parse(this.inputValidator.schema, data)) as TInput;
			}

			if (this.config.validateInput) {
				this.config.logger.warn("No validator adapter found for input schema, skipping validation");
			}

			return data as TInput;
		} catch (error) {
			this.config.logger.error("Input validation failed", error);
			if (error instanceof ValidationError) {
				throw error;
			}
			throw new ValidationError(
				"Validation failed",
				undefined,
				data,
				error instanceof Error ? error : undefined,
			);
		}
	}

	private async validateOutput(data: unknown): Promise<TOutput> {
		if (!this.outputValidator) {
			return data as TOutput;
		}

		try {
			const adapter = this.outputValidator.adapter || detectValidator(this.outputValidator.schema);

			if (adapter) {
				return (await adapter.parse(this.outputValidator.schema, data)) as TOutput;
			}

			if (this.config.validateOutput) {
				this.config.logger.warn(
					"No validator adapter found for output schema, skipping validation",
				);
			}

			return data as TOutput;
		} catch (error) {
			this.config.logger.error("Output validation failed", error);
			if (error instanceof ValidationError) {
				throw error;
			}
			throw new ValidationError(
				"Output validation failed",
				undefined,
				data,
				error instanceof Error ? error : undefined,
			);
		}
	}

	input<T>(schema?: unknown, adapter?: ValidatorAdapter<T>): Handler<T, TContext, TOutput> {
		const newHandler = this.clone() as unknown as Handler<T, TContext, TOutput>;

		if (schema === undefined) {
			return newHandler;
		}

		const isMultiInput = this.detectMultiInput(schema);
		newHandler.inputValidator = {
			schema,
			adapter: adapter as ValidatorAdapter<unknown> | undefined,
			isMultiInput,
		};

		return newHandler;
	}

	use<TNewContext>(
		middleware: Middleware<TContext, TNewContext>,
	): Handler<TInput, TContext & TNewContext, TOutput> {
		const newHandler = this.clone() as unknown as Handler<TInput, TContext & TNewContext, TOutput>;
		newHandler.middlewares.push(middleware);
		return newHandler;
	}

	handle<TOut>(fn: HandlerFunction<TInput, TContext, TOut>): Handler<TInput, TContext, TOut> {
		const newHandler = this.clone() as unknown as Handler<TInput, TContext, TOut>;
		newHandler.handlerFn = fn;
		return newHandler;
	}

	output<T>(schema?: unknown, adapter?: ValidatorAdapter<T>): Handler<TInput, TContext, T> {
		const newHandler = this.clone() as unknown as Handler<TInput, TContext, T>;

		if (schema === undefined) {
			return newHandler;
		}

		newHandler.outputValidator = {
			schema,
			adapter: adapter as ValidatorAdapter<unknown> | undefined,
		};

		return newHandler;
	}

	async execute(input: unknown, initialContext?: Partial<TContext>): Promise<TOutput> {
		try {
			if (!this.handlerFn) {
				throw new Error("Handler function not defined");
			}

			const validatedInput = this.config.validateInput
				? await this.validateInput(input)
				: (input as TInput);

			let context: TContext = { ...initialContext } as TContext;

			for (const middleware of this.middlewares) {
				const middlewareResult = await middleware(validatedInput, context);
				context = { ...context, ...middlewareResult } as TContext;
			}

			const output = await this.handlerFn(validatedInput, context);

			return this.config.validateOutput ? await this.validateOutput(output) : (output as TOutput);
		} catch (error) {
			this.config.logger.error("Handler execution failed", error);
			throw error;
		}
	}

	expectsMultiInput(): boolean {
		return this.inputValidator?.isMultiInput ?? false;
	}

	async express() {
		const { toExpress } = await import("./adapters/express.js");
		return toExpress(this);
	}

	async fastify() {
		const { toFastify } = await import("./adapters/fastify.js");
		return toFastify(this);
	}

	async hono() {
		const { toHono } = await import("./adapters/hono.js");
		return toHono(this);
	}

	async raw() {
		const { toRaw } = await import("./adapters/raw.js");
		return toRaw(this);
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
