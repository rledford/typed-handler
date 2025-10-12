/**
 * General handler error class
 */

export class HandlerError extends Error {
	constructor(
		message: string,
		public readonly statusCode: number = 500,
		public readonly details?: unknown,
	) {
		super(message);
		this.name = "HandlerError";
		// Maintains proper stack trace for where our error was thrown
		if (Error.captureStackTrace) {
			Error.captureStackTrace(this, HandlerError);
		}
	}
}
