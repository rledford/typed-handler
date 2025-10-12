import { describe, expect, it } from "vitest";
import { HandlerError } from "../../src/errors/handler.js";
import { ValidationError } from "../../src/errors/validation.js";

describe("ValidationError", () => {
	it("should create a ValidationError with message", () => {
		const error = new ValidationError("Invalid input");
		expect(error).toBeInstanceOf(ValidationError);
		expect(error).toBeInstanceOf(Error);
		expect(error.message).toBe("Invalid input");
		expect(error.name).toBe("ValidationError");
	});

	it("should create a ValidationError with field information", () => {
		const error = new ValidationError("Invalid email", "email");
		expect(error.field).toBe("email");
	});

	it("should create a ValidationError with value", () => {
		const value = { invalid: "data" };
		const error = new ValidationError("Invalid data", "body", value);
		expect(error.value).toBe(value);
	});

	it("should create a ValidationError with original error", () => {
		const originalError = new Error("Original error");
		const error = new ValidationError("Validation failed", undefined, undefined, originalError);
		expect(error.originalError).toBe(originalError);
	});

	it("should create a ValidationError with all parameters", () => {
		const originalError = new Error("Zod error");
		const value = { email: "invalid" };
		const error = new ValidationError("Email validation failed", "email", value, originalError);
		expect(error.message).toBe("Email validation failed");
		expect(error.field).toBe("email");
		expect(error.value).toBe(value);
		expect(error.originalError).toBe(originalError);
	});

	it("should have proper stack trace", () => {
		const error = new ValidationError("Test error");
		expect(error.stack).toBeDefined();
		expect(typeof error.stack).toBe("string");
	});
});

describe("HandlerError", () => {
	it("should create a HandlerError with message", () => {
		const error = new HandlerError("Handler failed");
		expect(error).toBeInstanceOf(HandlerError);
		expect(error).toBeInstanceOf(Error);
		expect(error.message).toBe("Handler failed");
		expect(error.name).toBe("HandlerError");
	});

	it("should create a HandlerError with default status code 500", () => {
		const error = new HandlerError("Handler failed");
		expect(error.statusCode).toBe(500);
	});

	it("should create a HandlerError with custom status code", () => {
		const error = new HandlerError("Not found", 404);
		expect(error.statusCode).toBe(404);
	});

	it("should create a HandlerError with details", () => {
		const details = { reason: "Database unavailable" };
		const error = new HandlerError("Handler failed", 503, details);
		expect(error.details).toBe(details);
	});

	it("should create a HandlerError with all parameters", () => {
		const details = { userId: 123, reason: "Unauthorized" };
		const error = new HandlerError("Access denied", 403, details);
		expect(error.message).toBe("Access denied");
		expect(error.statusCode).toBe(403);
		expect(error.details).toBe(details);
	});

	it("should have proper stack trace", () => {
		const error = new HandlerError("Test error");
		expect(error.stack).toBeDefined();
		expect(typeof error.stack).toBe("string");
	});
});
