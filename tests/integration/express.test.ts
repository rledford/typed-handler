import type { NextFunction, Request, Response } from "express";
import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { toExpress } from "../../src/adapters/express.js";
import { handler } from "../../src/index.js";

describe("Express Adapter", () => {
	it("toExpress should extract body for single input", async () => {
		const schema = z.object({ name: z.string() });
		const h = handler()
			.input(schema)
			.handle(async (input) => ({ message: `Hello ${input.name}` }));

		const expressHandler = toExpress(h);

		const req = { body: { name: "Alice" } } as Request;
		const res = {
			json: vi.fn(),
			status: vi.fn().mockReturnThis(),
		} as unknown as Response;
		const next = vi.fn() as NextFunction;

		await expressHandler(req, res, next);

		expect(res.json).toHaveBeenCalledWith({ message: "Hello Alice" });
		expect(next).not.toHaveBeenCalled();
	});

	it("toExpress should extract body/query/params/headers for multi-input", async () => {
		const h = handler()
			.input({
				body: z.object({ name: z.string() }),
				query: z.object({ filter: z.string() }),
				params: z.object({ id: z.string() }),
			})
			.handle(async (input) => ({
				body: input.body,
				query: input.query,
				params: input.params,
			}));

		const expressHandler = toExpress(h);

		const req = {
			body: { name: "Alice" },
			query: { filter: "active" },
			params: { id: "123" },
			headers: { "content-type": "application/json" },
		} as unknown as Request;
		const res = {
			json: vi.fn(),
			status: vi.fn().mockReturnThis(),
		} as unknown as Response;
		const next = vi.fn() as NextFunction;

		await expressHandler(req, res, next);

		expect(res.json).toHaveBeenCalledWith({
			body: { name: "Alice" },
			query: { filter: "active" },
			params: { id: "123" },
		});
	});

	it("toExpress should pass req and res in context", async () => {
		const h = handler()
			.input(z.object({ name: z.string() }))
			.use(async (_input, ctx) => {
				expect(ctx.req).toBeDefined();
				expect(ctx.res).toBeDefined();
				return { validated: true };
			})
			.handle(async (input, ctx) => {
				expect(ctx.req).toBeDefined();
				expect(ctx.res).toBeDefined();
				expect(ctx.validated).toBe(true);
				return { success: true };
			});

		const expressHandler = toExpress(h);

		const req = { body: { name: "Alice" } } as Request;
		const res = {
			json: vi.fn(),
			status: vi.fn().mockReturnThis(),
		} as unknown as Response;
		const next = vi.fn() as NextFunction;

		await expressHandler(req, res, next);

		expect(res.json).toHaveBeenCalledWith({ success: true });
	});

	it("toExpress should send JSON response with result", async () => {
		const h = handler()
			.input(z.object({ value: z.number() }))
			.handle(async (input) => ({ doubled: input.value * 2 }));

		const expressHandler = toExpress(h);

		const req = { body: { value: 21 } } as Request;
		const res = {
			json: vi.fn(),
			status: vi.fn().mockReturnThis(),
		} as unknown as Response;
		const next = vi.fn() as NextFunction;

		await expressHandler(req, res, next);

		expect(res.json).toHaveBeenCalledWith({ doubled: 42 });
	});

	it("toExpress should handle ResponseObject with status code", async () => {
		const h = handler()
			.input(z.object({ name: z.string() }))
			.handle(async (input) => ({
				status: 201,
				body: { created: true, name: input.name },
			}));

		const expressHandler = toExpress(h);

		const req = { body: { name: "Bob" } } as Request;
		const res = {
			json: vi.fn(),
			status: vi.fn().mockReturnThis(),
		} as unknown as Response;
		const next = vi.fn() as NextFunction;

		await expressHandler(req, res, next);

		expect(res.status).toHaveBeenCalledWith(201);
		expect(res.json).toHaveBeenCalledWith({ created: true, name: "Bob" });
	});

	it("toExpress should call next() with error on failure", async () => {
		const h = handler()
			.input(z.object({ value: z.number() }))
			.handle(async () => {
				throw new Error("Something went wrong");
			});

		const expressHandler = toExpress(h);

		const req = { body: { value: 42 } } as Request;
		const res = {
			json: vi.fn(),
			status: vi.fn().mockReturnThis(),
		} as unknown as Response;
		const next = vi.fn() as NextFunction;

		await expressHandler(req, res, next);

		expect(next).toHaveBeenCalled();
		expect(next.mock.calls[0][0]).toBeInstanceOf(Error);
		expect(next.mock.calls[0][0].message).toBe("Something went wrong");
		expect(res.json).not.toHaveBeenCalled();
	});

	it("toExpress should work with Zod validation", async () => {
		const h = handler()
			.input(z.object({ email: z.string().email() }))
			.handle(async (input) => ({ valid: true, email: input.email }));

		const expressHandler = toExpress(h);

		const req = { body: { email: "invalid-email" } } as Request;
		const res = {
			json: vi.fn(),
			status: vi.fn().mockReturnThis(),
		} as unknown as Response;
		const next = vi.fn() as NextFunction;

		await expressHandler(req, res, next);

		expect(next).toHaveBeenCalled();
		expect(res.json).not.toHaveBeenCalled();
	});
});
