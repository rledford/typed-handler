/**
 * typed-handler - Type-safe request handler library
 *
 * Main entry point
 */

export { handler } from "./handler.js";
export { configure, getConfig, resetConfig } from "./config.js";
export { registerAdapter } from "./validators/registry.js";

// Export types
export type {
	HandlerFunction,
	Middleware,
	HandlerConfig,
	Logger,
	ValidatorAdapter,
	MultiInput,
	InferInput,
	InferOutput,
} from "./types.js";

// Export errors
export { ValidationError, HandlerError } from "./errors/index.js";

// Export utilities
export { isResponseObject } from "./utils/response.js";
export type { ResponseObject } from "./utils/response.js";
