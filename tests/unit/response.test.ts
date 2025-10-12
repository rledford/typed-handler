import { describe, expect, it } from "vitest";
import { isResponseObject } from "../../src/utils/response.js";
import type { ResponseObject } from "../../src/utils/response.js";

describe("Response Utilities", () => {
	describe("isResponseObject", () => {
		it("should return true for valid ResponseObject", () => {
			const obj: ResponseObject = {
				status: 200,
				body: { success: true },
			};
			expect(isResponseObject(obj)).toBe(true);
		});

		it("should return true for ResponseObject with headers", () => {
			const obj: ResponseObject = {
				status: 201,
				body: { id: 123 },
				headers: { "Content-Type": "application/json" },
			};
			expect(isResponseObject(obj)).toBe(true);
		});

		it("should return false for null", () => {
			expect(isResponseObject(null)).toBe(false);
		});

		it("should return false for undefined", () => {
			expect(isResponseObject(undefined)).toBe(false);
		});

		it("should return false for non-object types", () => {
			expect(isResponseObject("string")).toBe(false);
			expect(isResponseObject(123)).toBe(false);
			expect(isResponseObject(true)).toBe(false);
		});

		it("should return false for array", () => {
			expect(isResponseObject([200, { body: "test" }])).toBe(false);
		});

		it("should return false for object missing status property", () => {
			const obj = {
				body: { success: true },
			};
			expect(isResponseObject(obj)).toBe(false);
		});

		it("should return false for object missing body property", () => {
			const obj = {
				status: 200,
			};
			expect(isResponseObject(obj)).toBe(false);
		});

		it("should return false for object with non-number status", () => {
			const obj = {
				status: "200",
				body: { success: true },
			};
			expect(isResponseObject(obj)).toBe(false);
		});

		it("should return true for ResponseObject with various status codes", () => {
			const codes = [200, 201, 204, 400, 404, 500];
			for (const status of codes) {
				const obj = { status, body: null };
				expect(isResponseObject(obj)).toBe(true);
			}
		});

		it("should return true for ResponseObject with any body type", () => {
			const bodies = [null, undefined, "string", 123, true, { key: "value" }, ["array"]];
			for (const body of bodies) {
				const obj = { status: 200, body };
				expect(isResponseObject(obj)).toBe(true);
			}
		});

		it("should return true for ResponseObject with extra properties", () => {
			const obj = {
				status: 200,
				body: { success: true },
				headers: { "X-Custom": "value" },
				extra: "property",
			};
			expect(isResponseObject(obj)).toBe(true);
		});
	});
});
