/**
 * Validation error class
 */

export class ValidationError extends Error {
	constructor(
		message: string,
		public readonly field?: string,
		public readonly value?: unknown,
		public readonly originalError?: unknown,
	) {
		super(message);
		this.name = "ValidationError";
		// Maintains proper stack trace for where our error was thrown
		if (Error.captureStackTrace) {
			Error.captureStackTrace(this, ValidationError);
		}
	}
}
