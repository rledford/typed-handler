import Joi from "joi";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import * as yup from "yup";
import { z } from "zod";
import {
	builtInAdapters,
	detectValidator,
	joiAdapter,
	yupAdapter,
	zodAdapter,
} from "../../src/validators/index.js";
import { clearAdapters, registerAdapter } from "../../src/validators/registry.js";

describe("Validator Adapters", () => {
	it("Zod adapter should detect Zod schema objects", () => {
		const schema = z.object({ name: z.string() });
		expect(zodAdapter.detect(schema)).toBe(true);
	});

	it("Zod adapter should parse valid data with Zod schema", async () => {
		const schema = z.object({ name: z.string() });
		const data = { name: "test" };
		const result = await zodAdapter.parse(schema, data);
		expect(result).toEqual(data);
	});

	it("Zod adapter should throw for invalid data", async () => {
		const schema = z.object({ name: z.string() });
		await expect(zodAdapter.parse(schema, { name: 123 })).rejects.toThrow();
	});

	it("Joi adapter should detect Joi schema objects", () => {
		const schema = Joi.object({ name: Joi.string() });
		expect(joiAdapter.detect(schema)).toBe(true);
	});

	it("Joi adapter should parse valid data with Joi schema", async () => {
		const schema = Joi.object({ name: Joi.string() });
		const data = { name: "test" };
		const result = await joiAdapter.parse(schema, data);
		expect(result).toEqual(data);
	});

	it("Joi adapter should throw for invalid Joi data", async () => {
		const schema = Joi.object({ name: Joi.string() });
		await expect(joiAdapter.parse(schema, { name: 123 })).rejects.toThrow();
	});

	it("Yup adapter should detect Yup schema objects", () => {
		const schema = yup.object({ name: yup.string() });
		expect(yupAdapter.detect(schema)).toBe(true);
	});

	it("Yup adapter should parse valid data with Yup schema", async () => {
		const schema = yup.object({ name: yup.string() });
		const data = { name: "test" };
		const result = await yupAdapter.parse(schema, data);
		expect(result).toEqual(data);
	});

	it("Yup adapter should throw for invalid Yup data", async () => {
		const schema = yup.object({ name: yup.string().required() });
		await expect(yupAdapter.parse(schema, {})).rejects.toThrow();
	});

	it("Built-in adapters should not detect non-schema objects", () => {
		const plainObject = { foo: "bar" };
		for (const adapter of builtInAdapters) {
			expect(adapter.detect(plainObject)).toBe(false);
		}
	});

	it("Zod adapter should return false for null or undefined", () => {
		expect(zodAdapter.detect(null)).toBe(false);
		expect(zodAdapter.detect(undefined)).toBe(false);
	});

	it("Joi adapter should return false for null or undefined", () => {
		expect(joiAdapter.detect(null)).toBe(false);
		expect(joiAdapter.detect(undefined)).toBe(false);
	});

	it("Joi adapter should return false for objects without validateAsync", () => {
		const fakeJoi = { $_root: true, type: "object" };
		expect(joiAdapter.detect(fakeJoi)).toBe(false);
	});

	it("Joi adapter should return false for objects with non-function validateAsync", () => {
		const fakeJoi = { $_root: true, type: "object", validateAsync: "not a function" };
		expect(joiAdapter.detect(fakeJoi)).toBe(false);
	});

	it("Yup adapter should return false for null or undefined", () => {
		expect(yupAdapter.detect(null)).toBe(false);
		expect(yupAdapter.detect(undefined)).toBe(false);
	});
});

describe("Validator Detector", () => {
	afterEach(() => {
		clearAdapters();
	});

	it("detectValidator should return Zod adapter for Zod schemas", () => {
		const schema = z.object({ name: z.string() });
		const result = detectValidator(schema);
		expect(result).toBe(zodAdapter);
	});

	it("detectValidator should return Joi adapter for Joi schemas", () => {
		const schema = Joi.object({ name: Joi.string() });
		const result = detectValidator(schema);
		expect(result).toBe(joiAdapter);
	});

	it("detectValidator should return Yup adapter for Yup schemas", () => {
		const schema = yup.object({ name: yup.string() });
		const result = detectValidator(schema);
		expect(result).toBe(yupAdapter);
	});

	it("detectValidator should return custom registered adapter before built-in", () => {
		const customAdapter = {
			name: "custom",
			detect: () => true,
			parse: async (schema: any, data: unknown) => data,
		};
		registerAdapter(customAdapter);

		const schema = z.object({ name: z.string() });
		const result = detectValidator(schema);
		expect(result).toBe(customAdapter);
	});

	it("detectValidator should return null for unknown schemas", () => {
		const plainObject = { foo: "bar" };
		const result = detectValidator(plainObject);
		expect(result).toBeNull();
	});
});
