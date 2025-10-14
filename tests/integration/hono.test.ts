import type { Context } from "hono";
import { describe, expect, it, vi } from "vitest";
import * as yup from "yup";
import { toHono } from "../../src/adapters/hono.js";
import { handler } from "../../src/index.js";

describe("Hono Adapter", () => {
	it("toHono should parse body as JSON for single input", async () => {
		const schema = yup.object({ name: yup.string().required() });
		const h = handler()
			.input(schema)
			.handle(async (input) => ({ message: `Hello ${input.name}` }));

		const honoHandler = toHono(h);

		const c = {
			req: {
				json: vi.fn().mockResolvedValue({ name: "Alice" }),
			},
			json: vi.fn(),
		} as unknown as Context;

		await honoHandler(c);

		expect(c.req.json).toHaveBeenCalled();
		expect(c.json).toHaveBeenCalledWith({ message: "Hello Alice" });
	});

	it("toHono should extract body/query/params/headers for multi-input", async () => {
		const h = handler()
			.input({
				body: yup.object({ name: yup.string().required() }),
				query: yup.object({ filter: yup.string() }),
				params: yup.object({ id: yup.string() }),
			})
			.handle(async (input) => ({
				body: input.body,
				query: input.query,
				params: input.params,
			}));

		const honoHandler = toHono(h);

		const c = {
			req: {
				json: vi.fn().mockResolvedValue({ name: "Alice" }),
				query: vi.fn().mockReturnValue({ filter: "active" }),
				param: vi.fn().mockReturnValue({ id: "123" }),
				raw: {
					headers: new Headers({ "content-type": "application/json" }),
				},
			},
			json: vi.fn(),
		} as unknown as Context;

		await honoHandler(c);

		expect(c.req.json).toHaveBeenCalled();
		expect(c.json).toHaveBeenCalledWith({
			body: { name: "Alice" },
			query: { filter: "active" },
			params: { id: "123" },
		});
	});

	it("toHono should pass context in handler context", async () => {
		const h = handler()
			.input(yup.object({ name: yup.string().required() }))
			.use(async (_input, ctx) => {
				expect(ctx.c).toBeDefined();
				return { validated: true };
			})
			.handle(async (input, ctx) => {
				expect(ctx.c).toBeDefined();
				expect(ctx.validated).toBe(true);
				return { success: true };
			});

		const honoHandler = toHono(h);

		const c = {
			req: {
				json: vi.fn().mockResolvedValue({ name: "Alice" }),
			},
			json: vi.fn(),
		} as unknown as Context;

		await honoHandler(c);

		expect(c.json).toHaveBeenCalledWith({ success: true });
	});

	it("toHono should return JSON response", async () => {
		const h = handler()
			.input(yup.object({ value: yup.number().required() }))
			.handle(async (input) => ({ doubled: input.value * 2 }));

		const honoHandler = toHono(h);

		const c = {
			req: {
				json: vi.fn().mockResolvedValue({ value: 21 }),
			},
			json: vi.fn(),
		} as unknown as Context;

		await honoHandler(c);

		expect(c.json).toHaveBeenCalledWith({ doubled: 42 });
	});

	it("toHono should handle ResponseObject with custom status", async () => {
		const h = handler()
			.input(yup.object({ name: yup.string().required() }))
			.handle(async (input) => ({
				status: 201,
				body: { created: true, name: input.name },
			}));

		const honoHandler = toHono(h);

		const c = {
			req: {
				json: vi.fn().mockResolvedValue({ name: "Bob" }),
			},
			json: vi.fn(),
		} as unknown as Context;

		await honoHandler(c);

		expect(c.json).toHaveBeenCalledWith({ created: true, name: "Bob" }, 201);
	});

	it("toHono should throw errors for framework error handling", async () => {
		const h = handler()
			.input(yup.object({ value: yup.number().required() }))
			.handle(async () => {
				throw new Error("Something went wrong");
			});

		const honoHandler = toHono(h);

		const c = {
			req: {
				json: vi.fn().mockResolvedValue({ value: 42 }),
			},
			json: vi.fn(),
		} as unknown as Context;

		await expect(honoHandler(c)).rejects.toThrow("Something went wrong");
	});

	it("toHono should work with Yup validation", async () => {
		const h = handler()
			.input(yup.object({ email: yup.string().email().required() }))
			.handle(async (input) => ({ valid: true, email: input.email }));

		const honoHandler = toHono(h);

		const c = {
			req: {
				json: vi.fn().mockResolvedValue({ email: "invalid-email" }),
			},
			json: vi.fn(),
		} as unknown as Context;

		await expect(honoHandler(c)).rejects.toThrow();
	});

	it("toHono should work with transform stage", async () => {
		const h = handler()
			.input(yup.object({ value: yup.number().required() }))
			.handle(async (input) => ({ result: input.value * 2 }))
			.transform((output) => ({ final: output.result + 10 }));

		const honoHandler = toHono(h);

		const c = {
			req: {
				json: vi.fn().mockResolvedValue({ value: 5 }),
			},
			json: vi.fn(),
		} as unknown as Context;

		await honoHandler(c);

		expect(c.json).toHaveBeenCalledWith({ final: 20 });
	});

	it("toHono should work with transform and context", async () => {
		const h = handler()
			.input(yup.object({ value: yup.number().required() }))
			.use(async () => ({ multiplier: 3 }))
			.handle(async (input, ctx) => ({ result: input.value * ctx.multiplier }))
			.transform((output, ctx) => ({
				result: output.result,
				multiplier: ctx.multiplier,
			}));

		const honoHandler = toHono(h);

		const c = {
			req: {
				json: vi.fn().mockResolvedValue({ value: 5 }),
			},
			json: vi.fn(),
		} as unknown as Context;

		await honoHandler(c);

		expect(c.json).toHaveBeenCalledWith({ result: 15, multiplier: 3 });
	});
});
