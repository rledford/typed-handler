import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { z } from 'zod';
import Joi from 'joi';
import * as yup from 'yup';
import {
	zodAdapter,
	joiAdapter,
	yupAdapter,
	builtInAdapters,
	detectValidator,
} from '../../src/validators/index.js';
import { registerAdapter, clearAdapters } from '../../src/validators/registry.js';

describe('Validator Adapters', () => {
	it('Zod adapter should detect Zod schema objects', () => {
		const schema = z.object({ name: z.string() });
		expect(zodAdapter.detect(schema)).toBe(true);
	});

	it('Zod adapter should parse valid data with Zod schema', async () => {
		const schema = z.object({ name: z.string() });
		const data = { name: 'test' };
		const result = await zodAdapter.parse(schema, data);
		expect(result).toEqual(data);
	});

	it('Zod adapter should throw for invalid data', async () => {
		const schema = z.object({ name: z.string() });
		await expect(zodAdapter.parse(schema, { name: 123 })).rejects.toThrow();
	});

	it('Joi adapter should detect Joi schema objects', () => {
		const schema = Joi.object({ name: Joi.string() });
		expect(joiAdapter.detect(schema)).toBe(true);
	});

	it('Joi adapter should parse valid data with Joi schema', async () => {
		const schema = Joi.object({ name: Joi.string() });
		const data = { name: 'test' };
		const result = await joiAdapter.parse(schema, data);
		expect(result).toEqual(data);
	});

	it('Joi adapter should throw for invalid Joi data', async () => {
		const schema = Joi.object({ name: Joi.string() });
		await expect(joiAdapter.parse(schema, { name: 123 })).rejects.toThrow();
	});

	it('Yup adapter should detect Yup schema objects', () => {
		const schema = yup.object({ name: yup.string() });
		expect(yupAdapter.detect(schema)).toBe(true);
	});

	it('Yup adapter should parse valid data with Yup schema', async () => {
		const schema = yup.object({ name: yup.string() });
		const data = { name: 'test' };
		const result = await yupAdapter.parse(schema, data);
		expect(result).toEqual(data);
	});

	it('Yup adapter should throw for invalid Yup data', async () => {
		const schema = yup.object({ name: yup.string().required() });
		await expect(yupAdapter.parse(schema, {})).rejects.toThrow();
	});

	it('Built-in adapters should not detect non-schema objects', () => {
		const plainObject = { foo: 'bar' };
		for (const adapter of builtInAdapters) {
			expect(adapter.detect(plainObject)).toBe(false);
		}
	});
});

describe('Validator Detector', () => {
	afterEach(() => {
		clearAdapters();
	});

	it('detectValidator should return Zod adapter for Zod schemas', () => {
		const schema = z.object({ name: z.string() });
		const result = detectValidator(schema);
		expect(result).toBe(zodAdapter);
	});

	it('detectValidator should return Joi adapter for Joi schemas', () => {
		const schema = Joi.object({ name: Joi.string() });
		const result = detectValidator(schema);
		expect(result).toBe(joiAdapter);
	});

	it('detectValidator should return Yup adapter for Yup schemas', () => {
		const schema = yup.object({ name: yup.string() });
		const result = detectValidator(schema);
		expect(result).toBe(yupAdapter);
	});

	it('detectValidator should return custom registered adapter before built-in', () => {
		const customAdapter = {
			name: 'custom',
			detect: () => true,
			parse: async (schema: any, data: unknown) => data,
		};
		registerAdapter(customAdapter);

		const schema = z.object({ name: z.string() });
		const result = detectValidator(schema);
		expect(result).toBe(customAdapter);
	});

	it('detectValidator should return null for unknown schemas', () => {
		const plainObject = { foo: 'bar' };
		const result = detectValidator(plainObject);
		expect(result).toBeNull();
	});
});
